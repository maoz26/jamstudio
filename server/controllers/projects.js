var Project = require('../model/projectSchema');
var User = require('../model/userSchema');
var Track = require('../model/trackSchema');
var File = require('../model/fileSchema');
var Channel = require('../model/channelSchema');
var errors = require('./errors');
var channels = require('./channels');
var mongoose = require('mongoose');

exports.createProject =  function(projectJson,callback){
	var project = new Project(projectJson);
    project.save(function(err) {
        if (err) 
        	return callback(errors.errorCreate((err?err:'')));
        var track = new Track();
        track.project = project._id;
        track.name = projectJson.name;
        track.description = projectJson.description;
        track.genre = projectJson.genre;
        track.version = 'ver 1.0';
        track.save(function(err){
            if (err) 
                return callback(errors.errorCreate((err?err:'')));
            project.track_version = track._id;
            project.tracks.push(track._id);
            project.save(function(err) {
                if (err) 
                    return callback(errors.errorCreate((err?err:'')));
                return callback(project);
            });

        });
    });
};

exports.getLastProject =  function(userId,callback){
    Project
        .findOne({adminUser:userId})
        .populate({path:'adminUser',select: ['firstName','lastName','email','picture']})
        .populate({path:'tracks'})
        .populate({path:'issues'})
        .populate({path:'users.user'})
        .exec(function (err, project) {
            if (err || !project)
                return callback(errors.errorNotFound((err?err:'')));
            else
                return callback(project);
        });
};

exports.getProjectByString = function(string,callback){
    console.log(string);
    Project
        .find({$or:[
        {"name": new RegExp('^'+string, "i")},
        {"genre": new RegExp('^'+string, "i")},
        {"description": new RegExp('^'+string, "i")}        
        ], "privacy":"Public"})
        .select(["name","_id","description","adminUser","users","genre"])
        .populate({path:'adminUser',select: ['firstName','lastName','email','picture']})
        .populate({path:'users',select:['_id','firstName','lastName','email','picture']})
        .exec(function (err, list) {
            console.log(list);
            if (err)
                return callback(errors.errorUpdate((err?err:'')));
            else
                return callback({'projects':list});
        });
     
}

exports.getProject =  function(projectId,callback){
    Project
        .findOne({_id:projectId})
        .populate({path:'adminUser',select: ['firstName','lastName','email','picture']})
        .populate({path:'track_version',
                        model: 'Track',
                            populate: {
                                path: 'channels',
                                options: { sort: { 'created_at': 1,'orderLevel': 1} } ,
                                model: 'Channel',
                                    populate: {
                                        path: 'samples.file',
                                        model: 'File'           
                                    }          
                            }})
        .populate({path:'issues.toUserId',select:["firstName","lastName","picture"]})
        .populate({path:'issues.fromUserId',select:["firstName","lastName","picture"]})
        .populate({path:'users.user'})
        .exec(function (err, project) {
            if (err || !project)
        		return callback(errors.errorNotFound((err?err:'')));
            else
        		return callback(project);
        });
};

exports.deleteProject = function(projectId,callback){
	Project.findOne( {_id:projectId}, function(err, project){
		if(err || !project)
    		return callback(errors.errorNotFound((err?err:'')));
    	else
	    	project.remove(function(err,project){
	    		if(err)
	    			return callback(errors.errorDelete((err?err:'')));
	    		return callback(project);
	    	});
	});
};

exports.getVersions = function(projectId,callback){
    Project
    .findOne({_id:projectId})
    .select(["tracks"])
    .populate({path:'tracks',select:['trackId','projectId','name','description','genre','version']})
    .exec(function (err, versions) {
        if (err || !versions)
    		return callback(errors.errorNotFound((err?err:'')));
        else
    		return callback(versions);
    });
};

exports.makeProjectVersion = function(projectId,trackId,body,callback){
    Track
    .findOne({_id: trackId })
    .exec(function (err, _track) {
        if (err || !_track) 
            return callback(errors.errorNotFound((err?err:'')));
        // create track
        _track._id = mongoose.Types.ObjectId();
        if(body.version)
            _track.version = body.version;
        _track.isNew = true; 
        var copyChannelList = _track.channels;
        _track.channels = [];
        var newChannelList = [];
        for (var i = copyChannelList.length - 1; i >= 0; i--) {
            Channel.findOne({_id: copyChannelList[i]}).
            exec(function (err, _channel) {
                if(err || !_channel)
                    return;     
                var lastId = _channel._id;
                _channel.trackId = _track._id;
                var newId = mongoose.Types.ObjectId();
                _channel._id = newId;
                _channel.isNew = true; 
                 for (var i = _channel.samples.length - 1; i >= 0; i--) {
                    sample = _channel.samples[i];
                    sample.isNew = true;
                    sample._id = mongoose.Types.ObjectId();
                    sample.channelId = newId;
                 }

                _channel.save(function(err,data){
                    if(err)
                        return;
                    newChannelList.push(data._id);
                    //_track.channels.pull(lastId);
                  
                    //_track.channels.push(data._id);
                    console.log('lastId :'+ lastId + ' newId:'+newId);
                    if(newChannelList.length == copyChannelList.length){
                        _track.channels = newChannelList;
                        _track.save(function(err,data){
                            if (err) 
                                return;
                        });
                    }
                });
            });
        }

        Project.findOne({_id: projectId}).
        exec(function (err, _project) {
            _project.track_version = _track._id;
            _project.tracks.push( _track._id);
            _project.save(function(err,data){
                if(err)
                    return callback(errors.errorUpdate((err?err:'')));
                return callback(data);
            });
        });
    });
};

exports.getListByUser = function(userId,callback){
	Project
    .find({adminUser:userId})
    .select(["name","_id","description","adminUser","users","genre"])
    .populate({path:'adminUser',select: ['firstName','lastName','email','picture']})
    .populate({path:'users',select:['_id','firstName','lastName','email','picture']})
    .exec(function (err, adminProjects) {
        if (err)
        	return callback(errors.errorNotFound((err?err:'')));
         Project
        .find({ adminUser:{ $ne: userId },users: { $elemMatch: { user:userId } } })
        .select(["name","_id","description","adminUser","users","genre"])
        .populate({path:'adminUser',select: ['firstName','lastName','email','picture']})
        .populate({path:'users',select:['_id','firstName','lastName','email','picture']})
        .exec(function (err, contributorProject) {
            console.log(contributorProject);
            if (err)
        		return callback(errors.errorUpdate((err?err:'')));
            else
                return callback({'admin':adminProjects, 'contributor': contributorProject});
        });
  

    });
};

exports.updateProject =  function(projectId,projectJson,callback){
    Project.update( {_id:projectId}, {
    "adminUser": projectJson.adminUser,
    "name": projectJson.name,
    "description": projectJson.description,
    "genre": projectJson.genre,
    "track_version": projectJson.track_version,
    "users": projectJson.users,
    "issues": projectJson.issues,
    "tracks": projectJson.tracks
    }, function(err, data){
        if (err)
            return callback(errors.errorNotFound((err?err:'')));
        else
            return callback(data);
    });
};

exports.updateProjectInfo =  function(projectId,projectJson,callback){
    Project.update( {_id:projectId}, {
    "name": projectJson.name,
    "description": projectJson.description,
    "genre": projectJson.genre
    }, function(err, data){
        if (err)
            return callback(errors.errorNotFound((err?err:'')));
        else
            return callback(data);
    });
};


exports.updateProjectVersion =  function(projectId,trackId,callback){
    Project.update( {_id:projectId}, {track_version:trackId}, function(err, data){
        if (err)
    		return callback(errors.errorNotFound((err?err:'')));
        else
    		return callback(data);
    });
};

exports.updateProjectPrivacy =  function(projectId,projectJson,callback){
    Project.update( {_id:projectId}, {privacy:projectJson.privacy}, function(err, data){
        if (err)
            return callback(errors.errorNotFound((err?err:'')));
        else
            return callback(data);
    });
};


exports.addUser = function(projectId,userId,access,byUserId,callback){
    checkUserPermissions(projectId,byUserId,function(result){
        if(result)
            User.findOne({_id:userId},function(err,user){       
                if(err || !user){
                    return callback(errors.errorNotFound((err?err:'')));
                }
                else{
                    Project.update( {_id:projectId,'users.user': { $ne: userId }}, {$push: {users: {user:userId,access:access}}}, function(err, data){
                        if(err) 
                            return callback(errors.errorUpdate((err?err:'')));
                        else
                            return callback(data);
                    });
                }
            });
        else
            return callback(errors.errorPermitions(('')));
    });   
};


function checkUserPermissions(projectId,userId,callback){
    Project.findOne({_id:projectId},function(err,project){
        if(project.adminUser == userId){
            console.log(userId);
            return callback(true);            
        }
        else{
            var found = false;
            for (var i = project.users.length - 1; i >= 0; i--) {
                console.log(project.users[i].user);
                console.log(project.users[i].access);
                if(project.users[i].user == userId && project.users[i].access == '1'){
                    found = true;
                    return callback(true);
                }
            }
            return callback(found);
        }
    });
}

function checkAdminPermissions(projectId,userId,callback){
    Project.findOne({_id:projectId},function(err,project){
        if(project.adminUser == userId)
            return callback(true);            
        else
            return callback(false);     
    });
}


exports.deleteUser = function(projectId,userId,byUserId,callback){
    checkUserPermissions(projectId,byUserId,function(result){
        if(result || userId==byUserId)
            Project.update( {_id:projectId}, {$pull: {users: {user:userId}}}, function(err, data){
                if(err || !data)
                    return callback(errors.errorNotFound((err?err:'')));
                return callback(data);
            });
        else
            return callback(errors.errorPermitions(('')));
    });
};


exports.updateUserAccess =  function(projectId,userId,access,byUserId,callback){
    checkUserPermissions(projectId,byUserId,function(result){
        if(result)
            Project.update( {_id:projectId,users: { $elemMatch: { user:userId } }},  { $set:{ "users.$.access":access }}, function(err, data){
                if(err)
                    return callback(errors.errorUpdate((err?err:'')));
                return callback(data);
            });
        else
            return callback(errors.errorPermitions(('')));
    });
};

exports.getContributors = function(projectId,callback){
	Project
    .findOne( {_id:projectId})
    .select(["users","adminUser"])
    .populate({path:'adminUser',select:['firstName','lastName','picture']})
    .populate({path:'users.user',select:['firstName','lastName','picture']})
    .exec(function(err, data)
    {
 		if(err)
            return callback(errors.errorNotFound((err?err:'')));
        return callback(data);
    });
};

exports.addIssue = function(projectId,issueJson,callback){
    issueJson.projectId = projectId;
	Project.
    findOne({_id:projectId},function(err,project){
		if(err || !project)
            return callback(errors.errorNotFound((err?err:'')));
        project.issues.push(issueJson);
        project.save(function(err,data){
	 		if(err)
	            return callback(errors.errorUpdate((err?err:'')));
	        return callback(data);
        });
    });
};

exports.getIssue = function(projectId,issueId,callback){
	Project
	.findOne({_id:projectId}, {issues: { $elemMatch: { _id : issueId } } } )
	.exec(function (err, project) {
 		if(err || !project || !project.issues[0])
            return callback(errors.errorNotFound((err?err:'')));
        return callback(project.issues[0]);
	});
};

exports.deleteIssue = function(projectId,issueId,callback){
    Project.update( {_id:projectId}, {$pull: {issues: {_id:issueId}}}, function(err, data){
        if(err || !data)
            return callback(errors.errorNotFound((err?err:'')));
        return callback(data);
    });
};

exports.updateIssue = function(projectId,issueId,issueJson,callback){    
    Project.update( {_id:projectId,issues: { $elemMatch: { _id:issueId } }},  { $set:{
     "issues.$.fromUserId":issueJson.fromUserId,
     "issues.$.toUserId":issueJson.toUserId,
     "issues.$.name":issueJson.name,
     "issues.$.description":issueJson.description,
     "issues.$.status":issueJson.status
    }}, function(err, data){
        if(err || !data)
            return callback(errors.errorNotFound((err?err:'')));
        return callback(data);
    });
};

