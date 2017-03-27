var max_time = 60*20;
var time_units = 5;
var unit_width = 10;
var z_index = 3;
var samples = new Array();
var p = new player();

function zoomIn(){
	if(unit_width>20)
		return;
	unit_width=unit_width*1.1;
	zoom();
}
function zoomOut(){
	if(unit_width<4)
		return;
	unit_width = unit_width/1.1;
	zoom();
}

function DrawGrid(unit_width){
		var cells = Math.round(max_time/time_units);				
		// intialize elements
		$('#channels_list').html('');
		$('.channels_grid_title').html('');
		$('.channel_grid_row').html('');
		// generate grid title
		for (var i = 0; i < cells; i++) {
				$('.channels_grid_title').append('<div class="time-box">'+(i*time_units+time_units)+'</div><div class="time-box-border"></div>');
			}
		// generate grid rows
		for (var i = 0; i < samples.length; i++) {
			drawChannel(i,cells);
		}	
		// draw cursorLine
		zoom();	
	}		

function drawChannel(i,cells){
	// create grid row
	var row = $('<div><article class="channel_list_row" ></article><article class="channel_grid_row" ondrop="drop(event)" ondragover="allowDrop(event)" id="channel_grid_row_'+i+'"></article></article></div>');
	// create and append, grid cells to grid row
	for (var j = 0; j < cells; j++) {
		$(row).find('.channel_grid_row').append('<div class="time-box"></div><div class="time-box-border"></div>');
	}
	// create and append, grid sample placeholder to grid row
	$(row).find('.channel_grid_row').append('<article class="sample_placeholder" id="sample_placeholder_'+ i +'"><article class="sample" id="sample'+ i +'" ondragstart="drag(event)" draggable="true" data-index="'+i+'" data-time="'+samples[i].time+'" data-start="'+samples[i].start+'"></article>');
	// append grid row to channel list
	$('#channels_list').append(row);
}	

var initialize = function(){
	//for (var i = 3 - 1; i >= 0; i--) {
		samples.push(new Sample('includes/loops/1.wav',16,random(80),1));
		samples.push(new Sample('includes/loops/2.wav',8,random(80),0.4));
		samples.push(new Sample('includes/loops/3.wav',9,random(80),1));
		samples.push(new Sample('includes/loops/4.wav',4,random(80),1));
		samples.push(new Sample('includes/loops/5.wav',17,random(80),1));
		samples.push(new Sample('includes/loops/6.wav',9,random(80),1));
	//}
};

function random(max){
	return Math.floor((Math.random() * max) + 1);
}

function player(){

	player.timeouts = new Array();
	player.intervals = new Array();
	player.playTime = 0;
	player.isPlaying = false;

	this.setTime =  function(playTime){
		player.playTime = playTime*100;
		$('#time').text(playTime);
		$('#cursorLine').css({'left':secondsToOffset(playTime)});
	}
	this.play = function(playTime){
			//console.log(samples);
			if(player.isPlaying)
				return;
			player.isPlaying = true;
			var st1 =setInterval(function(){						
				$('#time').text(++player.playTime/100);
				//console.log(player.playTime/100);
			},10);
			player.intervals.push(st1);
			// music
			$(samples).each(function(index){
				var el = $(this);
				var timeToStartPlaying = parseFloat($(el)[0].start_)-parseFloat(player.playTime)/100;
				var startAt = 0;
				var remainToStart = 0;
				// start at

				if(timeToStartPlaying<0){
					//console.log('remain to start:'+ index +':'+ timeToStartPlaying);
					if(Math.abs(timeToStartPlaying)>$(el)[0].time_)
						return;
					remainToStart = 0;
				}else{
					//console.log('remain to start:'+ timeToStartPlaying);
					remainToStart = timeToStartPlaying;							
				}
			
				if(timeToStartPlaying<0 ){
					//console.log('start at:'+ timeToStartPlaying);
					startAt = Math.abs(timeToStartPlaying);	
				}else{
					startAt = 0;
					//console.log('start at:'+ 0);
				}
				console.log(index + ': remainToStart:' + remainToStart);
				var st = setTimeout(function(){
					$(el)[0].audi.currentTime = startAt;
					$(el)[0].audi.play();
				},remainToStart*1000);	
				player.timeouts.push(st);
			});
			//cursor					
	    	$('#cursorLine').animate({'left':unit_width*max_time},max_time*1000, 'linear');
	};
	this.pause = function(){
		console.log('pause');
		player.isPlaying = false;
		// music
			$(samples).each(function(){
				var el = $(this);
				$(el)[0].audi.pause();
			});		
			reset();		
		// cursor
		$('#cursorLine').stop();
	};
	this.stop = function(){
		console.log('stop');
		player.isPlaying = false;
		// music
			$(samples).each(function(){
				var el = $(this);
				console.log($(el)[0]);
				$(el)[0].audi.pause();
				$(el)[0].audi.currentTime = 0;
			});		
			$('#time').text(player.playTime=0);	
			reset();	
		// cursor
		$('#cursorLine').stop();
	    $('#cursorLine').css({'left':0});
	};

	function reset(){
		for (var i = player.intervals.length - 1; i >= 0; i--) {
			clearInterval(player.intervals[i]);
		}
		player.intervals = new Array()
		for (var i = player.timeouts.length - 1; i >= 0; i--) {
			clearTimeout(player.timeouts[i]);
		}
		player.timeouts = new Array()
	}
}

var Channel = class Channel {
  constructor(volume,username,userId,type) {
    this.volume = volume;
    this.username = username;
    this.userId = userId;
    this.type = type;		    
  }
}

var Sample = class Sample {
  constructor(file, time, start,volume,username,userId,type) {
    this.file = file;
    this.time = time;
    this.start = start;
    this.aud = new Audio();
    this.aud.src = file; 
    this.aud.volume = volume;
    this.username = username;
    this.userId = userId;
    this.type = type;		    
  }
   get audi(){
   	return this.aud;
   }
   get start_(){
   	return this.start;
   }
   set start_(start){
   	 this.start = start;
   }
   get time_(){
   	return this.audi.buffered.end(0);
   }
   set time_(time){
   	 this.time = time;
   }
};

function zoom(){
	$('.channels_grid_title div.time-box').css('width',unit_width*time_units);
	$('main #channels_list > div').css('height',unit_width*10);
	$('.channel_grid_row').find('div.time-box').css('width',unit_width*time_units);
	var time_offset = secondsToOffset(max_time)+5;
	$('.channels_grid_title').css('width',time_offset);
	$('.channel_grid_row').css('width',time_offset);
	$('#channels_list').css('width',time_offset+160);
	$('#channels_title').css('width',time_offset+160);
	$('.sample').each(function(){
		refreshSample(this);
	});
	if(player.isPlaying){
		p.pause();
		$('#cursorLine').css('left',secondsToOffset(player.playTime/100));
		p.play();
	}
	else
		$('#cursorLine').css('left',secondsToOffset(player.playTime/100));
	$('#cursorLine').css('height',$('.channel_grid_row').length*(unit_width*10+1)+24);

	console.log(secondsToOffset(player.playTime/100));

}
function refreshSample(element){
	var width = $(element).attr("data-time")*unit_width+ ($(element).attr("data-time")/time_units-2);
	$(element).css('width',width);
	$(element).css('left',secondsToOffset($(element).attr("data-start")));
	//createSoundSpectrum(element,width,100);
}
function createSoundSpectrum(sample,width,height){
	if($(sample).find('canvas').length==0){
		console.log('new can');
		var newCanvas   = createCanvas (width, height);
 		var context = newCanvas.getContext('2d');
 		function createCanvas ( w, h ) {
		    var newCanvas = document.createElement('canvas');
		    newCanvas.width  = w;     newCanvas.height = h;
		    return newCanvas;
		};
		drawSoundFile(function(data){
			console.log(data);
		},context,newCanvas,height,width,samples[$(sample).attr('data-index')].aud.src);
		$(sample).append(newCanvas);
	}
}
function refreshSamples(){
	$('.sample').each(function(data){
		refreshSample(this);
	});	
}
function updateSampleStart(i,start){
	samples[i].start_ = start;
}
function offsetToSeconds(offset){
	var borders = Math.floor(offset/((time_units*unit_width)));
    var all = ((offset-borders)/(time_units*unit_width))*time_units;
    return all;
}
function secondsToOffset(sec){
	var real = Math.floor(sec*unit_width);
	var borders = Math.floor(real/((time_units*unit_width)));
    return real+borders;
}

function collouringGridRow(el,isMulti){
	console.log(isMulti);
	if(isMulti)
		if($(el.target).parent().hasClass('row_pressed'))
			$(el.target).parent().removeClass('row_pressed');
		else
			$(el.target).parent().addClass('row_pressed');
	else{
		$('.channel_grid_row').removeClass('row_pressed');
		$(el.target).parent().addClass('row_pressed');
	}
}

// drag and drop 
function allowDrop(ev) {
    ev.preventDefault();
}
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    console.log(ev.target.style.left);	
}
function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var dragged = document.getElementById(data);		   
    var target = ev.target;
    var new_offset = $('main').scrollLeft()+ ev.pageX - mouse_offset - 160;
	if(new_offset<0)
		new_offset = 0;
	// drop on sample
    if($(target).hasClass('sample')){
    	if($(target).parent().attr('id') != $(dragged).parent().attr('id')){
    		$($(target).parent()).append(dragged); // drop on sample on other layer
    	}
		$('#'+data).css('left', new_offset);
    }
    // drop on layer
    else{
    	($(target).parent()).find('.sample_placeholder').append(dragged);
    	$('#'+data).css('left', new_offset);
    }
    // z-index up
    $('#'+data).css('z-index', z_index++);
    $('#channels_title').css('z-index', z_index++);
    // define new start
    var borders = Math.floor(new_offset/((time_units*unit_width)));
    var all = ((new_offset-borders)/(time_units*unit_width))*time_units;
    $('#'+data).attr('data-start', all);
    updateSampleStart($('#'+data).attr('data-index'),$('#'+data).attr('data-start'));
	if(player.isPlaying){
		p.pause();
		p.play();
	}
}

// Listeners
var mouse_offset;
$(document).on('mousedown', function(e){
    mouse_offset = e.pageX - $(e.target).offset().left;
});
$(document).on('mouseup', function(e){

});
$(document).bind('click',function(el){	
	if($(el.target).hasClass('sample'))
    	$(el.target).css('z-index', z_index++);
        $('#channels_title').css('z-index', z_index++);
});
var shifted = false;
$(document).on('keyup keydown', function(e){shifted = e.shiftKey} );




$(document).ready(function(){
	initialize();
	getData();
	DrawGrid(unit_width);
	$("#play").click(function(){
		p.play();
	});
	$("#pause").click(function(){
		p.pause();
	});
	$("#stop").click(function(){
		p.stop();
	});
	$(".channel_grid_row").on('click',function(e){
		if(player.isPlaying){
			p.pause();
			p.setTime(offsetToSeconds($('main').scrollLeft()+ e.pageX  - 160));
			p.play();
		}
		else
			p.setTime(offsetToSeconds($('main').scrollLeft()+ e.pageX  - 160));				
	});
	$('main').scroll(function(){
	    $('#channels_title').css({
	        'top': $(this).scrollTop() 
	    });
	});

});
		