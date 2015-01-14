var restify = require('restify');

var ENDPOINT = 'https://api.truevault.com';

function isJSON(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

function parsedJSON(str) {
	var parsed = null;

	try {
		parsed = JSON.parse(str);
	} catch (e) {

	}

	return parsed;
}

var base64Encode = function(document) {
	if (typeof document == 'string') {
		return document;
	} else if (typeof document == 'object') {
		if (isJSON(document)) {
			return new Buffer(document).toString('base64');
		} else {
			return new Buffer(JSON.stringify(document)).toString('base64');
		}
	} else {
		return String.valueOf(document);
	}
};

var base64Decode = function(document) {
	var parsed = parsedJSON(document);

	if (parsed) {
		return new Buffer(parsed.document, 'base64');
	} else {
		return JSON.parse(new Buffer(document, 'base64').toString('ascii'));
	}
};

function jsonToFormString(obj) {
	formStringComponents = [];
	for(key in obj) {
		if (typeof obj[key] == 'object') {
			representation = JSON.stringify( obj[key] );
		} else {
			representation = obj[key];
		}
		formStringComponents.push(key+'='+encodeURIComponent( representation ) );
	}
	return formStringComponents.join('&');
}

var handleResult = function(callback, decode, fromStringClient) {
	return function(err,req,res,result) {
		if (err) {
			if (fromStringClient) {
				err.message = JSON.parse(err.message);
			}
			callback({ code: TrueVault.StatusCode['s' + err.statusCode], err: err});
		} else {
			if (decode) {
				callback(null,base64Decode(res.body));
			} else if (fromStringClient) {
				callback(null,JSON.parse(result));
			} else {
				callback(null,result);
			}
		}
	};
};

var createBlobOptions = function (path) {
	return {
		path: path,
		headers: {
			'content-type': 'application/octet-stream'
		}
	};
};

var warnDeprecation = function(reason) {
	if (this.deprecationWarned) {
		console.log('TrueVaultJS warning: you are using a deprecated API that will be removed in the next version (' + reason + ')');
	}
	this.deprecationWarned = true;
};

function TrueVaultUserStore(client) {
	this.client = client;
}

TrueVaultUserStore.prototype = {
	create: function(username,password,attributes,schemaId,callback) {
		this.client.post('/v1/users',{ username : username, password : password, attributes : base64Encode(attributes), schema_id : schemaId }, handleResult(callback));
	},
	update: function(userId,username,password,accessToken,attributes,status,callback)  {
		this.client.put('/v1/users/' + userId, { username : username, password : password, access_token : accessToken, attributes : base64Encode(attributes), status : status }, handleResult(callback));
	},
	del: function(userId,callback) {
		this.client.del('/v1/users/' + userId, handleResult(callback));
	},
	get: function(userId,callback) {
		this.client.get('/v1/users/' + userId, handleResult(callback,true));
	},
	accessToken: function(userId,callback) {
		this.client.post('/v1/users/' + userId + '/access_token', {}, handleResult(callback));
	},
	apiKey: function(userId,callback) {
		this.client.post('/v1/users/' + userId + '/api_key', {}, handleResult(callback));
	},
	accessKey: function(userId,callback) {
		this.client.post('/v1/users/' + userId + '/access_key', {}, handleResult(callback));
	}
};

function TrueVaultGroupStore(client, stringClient) {
	this.client = client;
	this.stringClient = stringClient;
}

TrueVaultGroupStore.prototype = {
	create: function(name,policy,userIds,callback) {
		formParams = { name : name, policy : base64Encode(policy), user_ids : userIds };
		formParamString = jsonToFormString(formParams);
		this.stringClient.post('/v1/groups', formParamString, handleResult(callback, false, true));
	},
	update: function(groupId,name,policy,userIds,operation,callback) {
		this.client.put('/v1/groups/' + groupId, { name : name, policy : base64Encode(policy), user_ids : userIds, operation : operation }, handleResult(callback));
	},
	del: function(groupId,callback) {
		this.client.del('/v1/groups/' + groupId, handleResult(callback));
	},
	get: function(groupId,callback) {
		this.client.get('/v1/groups/' + groupId, handleResult(callback, true));
	},
	list: function(callback) {
		this.client.get('/v1/groups', handleResult(callback));
	}
};

function TrueVaultJsonStore(client) {
	this.client = client;
}

TrueVaultJsonStore.prototype = {
	create: function(vaultId,document,callback) {
		this.client.post('/v1/vaults/' + vaultId + '/documents',{ document : base64Encode(document) }, handleResult(callback));
	},
	update: function(vaultId,documentId,document,callback)  {
		this.client.put('/v1/vaults/' + vaultId + '/documents/' + documentId, { document : base64Encode(document) }, handleResult(callback));
	},
	del: function(vaultId,documentId,callback) {
		this.client.del('/v1/vaults/' + vaultId + '/documents/' + documentId, handleResult(callback));
	},
	get: function(vaultId,documentId,callback) {
		this.client.get('/v1/vaults/' + vaultId + '/documents/' + documentId, handleResult(callback,true));
	}
};

function TrueVaultBlobStore(client) {
	this.client = client;
}

TrueVaultBlobStore.prototype = {
	create: function(vaultId,document,callback) {
		this.client.post(createBlobOptions('/v1/vaults/' + vaultId + '/blobs'), { document : base64Encode(document) }, handleResult(callback));
	},
	update: function(vaultId,documentId,document,callback)  {
		this.client.put(createBlobOptions('/v1/vaults/' + vaultId + '/blobs/' + documentId), { document : base64Encode(document) }, handleResult(callback));
	},
	del: function(vaultId,documentId,callback) {
		this.client.del('/v1/vaults/' + vaultId + '/blobs/' + documentId, handleResult(callback));
	},
	get: function(vaultId,documentId,callback) {
		this.client.get('/v1/vaults/' + vaultId + '/blobs/' + documentId, handleResult(callback,true));
	}
};

function TrueVaultVaultStore(client) {
	this.client = client;
}

TrueVaultVaultStore.protoype = {
	create: function(name,callback) {
		this.client.post('/v1/vaults' + vaultId,{ name : name }, handleResult(callback));
	},
	update: function(vaultId,name,callback)  {
		this.client.put('/v1/vaults/' + vaultId, { name : name }, handleResult(callback));
	},
	del: function(vaultId,callback) {
		this.client.del('/v1/vaults/' + vaultId, handleResult(callback));
	},
	get: function(vaultId,callback) {
		this.client.get('/v1/vaults/' + vaultId, handleResult(callback));
	},
	all: function(callback) {
		this.client.get('/v1/vaults', handleResult(callback));
	}
};

function TrueVaultSchemaStore(client) {
	this.client = client;
}

TrueVaultSchemaStore.protoype = {
	create: function(vaultId,document,callback) {
		this.client.post('/v1/vaults/' + vaultId + '/schemas',{ document : base64Encode(document) }, handleResult(callback));
	},
	update: function(vaultId,documentId,document,callback)  {
		this.client.put('/v1/vaults/' + vaultId + '/schemas/' + documentId, { document : base64Encode(document) }, handleResult(callback));
	},
	del: function(vaultId,documentId,callback) {
		this.client.del('/v1/vaults/' + vaultId + '/schemas/' + documentId, handleResult(callback));
	},
	get: function(vaultId,documentId,callback) {
		this.client.get('/v1/vaults/' + vaultId + '/schemas/' + documentId, handleResult(callback,true));
	},
	all: function(vaultId,callback) {
		this.client.get('/v1/vaults/' + vaultId + '/schemas', handleResult(callback,true));
	}
};

function TrueVaultSearchEngine(client) {
	this.client = client;
}

TrueVaultSearchEngine.prototype = {
	get: function(vaultId,query,callback) {
		callback(TrueVault.StatusCode.s9501);
	}
};

function TrueVault(apikey) {
	this.deprecationWarned = false;

	this.apikey = apikey;
	this.client = restify.createJsonClient({
		url: ENDPOINT
	});
	this.client.basicAuth(apikey,'');
	this.stringClient = restify.createStringClient({
		url: ENDPOINT
	});
	this.stringClient.basicAuth(apikey,'');
	this.user = new TrueVaultUserStore(this.client);
	this.vault = new TrueVaultVaultStore(this.client);
	this.group = new TrueVaultGroupStore(this.client, this.stringClient);
	this.json = new TrueVaultJsonStore(this.client);
	this.blob = new TrueVaultBlobStore(this.client);
	this.schema = new TrueVaultSchemaStore(this.client);
	this.search = new TrueVaultSearchEngine(this.client);
}

TrueVault.StatusCode = {
		's200': 'OK',
		's400': 'Bad Request - Are you missing a required parameter?',
		's401': 'Unauthorized - No valid API key provided',
		's402': 'Request Failed - Parameters were valid but request failed',
		's404': 'Not Found - The requested item doesn\'t exist',
		's500': 'Server error',
		's502': 'Server error',
		's503': 'Server error',
		's504': 'Server error',
		's9501': 'Method not implemented'
};

TrueVault.prototype = {
	// JSON methods; deprecated; use TrueVault.json.* instead
	create: function(vaultId,document,callback) {
		warnDeprecation('JSON store now accessed using TrueVault.document.*');
		this.client.post('/v1/vaults/' + vaultId + '/documents',{ document : base64Encode(document) }, handleResult(callback));
	},
	update: function(vaultId,documentId,document,callback)  {
		warnDeprecation('JSON store now accessed using TrueVault.document.*');
		this.client.put('/v1/vaults/' + vaultId + '/documents/' + documentId, { document : base64Encode(document) }, handleResult(callback));
	},
	del: function(vaultId,documentId,callback) {
		warnDeprecation('JSON store now accessed using TrueVault.document.*');
		this.client.del('/v1/vaults/' + vaultId + '/documents/' + documentId, handleResult(callback));
	},
	get: function(vaultId,documentId,callback) {
		warnDeprecation('JSON store now accessed using TrueVault.document.*');
		this.client.get('/v1/vaults/' + vaultId + '/documents/' + documentId, handleResult(callback,true));
	}
};

var truevault = module.exports = exports = TrueVault;
