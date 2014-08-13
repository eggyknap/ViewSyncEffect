 /**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 * @author arodic / http://aleksandarrodic.com/
 * @author alfski / http://uws.edu.au/eresearch/
 */

// Globals - bad?

var cameraViewSync = new THREE.PerspectiveCamera();

THREE.ViewSyncEffect = function ( renderer ) {

	// internals

	var _websocket = new WebSocket( "ws://192.168.0.233:3000/relay" ); // arg?

	var _yawRads = 0.0; // Alf - yaw rotation offset in radians

	var _position = new THREE.Vector3();
	var _quaternion = new THREE.Quaternion();
	var _scale = new THREE.Vector3(); // needed but not used

	var _yawAxis = new THREE.Vector3( 0,1,0 ); // yaw - rotate around Y
	var _rollAxis = new THREE.Vector3( 0,0,1 ); // roll - rotate around Z ?check?
	var _pitchAxis = new THREE.Vector3( 1,0,0 ); // pitch - rotate around X ?check?

	// initialization
	var _wsConnected = false;
	var _slave = false;
	var _yaw = 0.0;
	var _fov = 0.0;
	var _lastMesg = "";

	// parse URL parameters
	var _qryArgs = _getQueryStringVars();

	if ( _qryArgs[ "slave" ] ) { _slave = true; }
	if ( _qryArgs[ "yaw" ] ) {
		_yaw = _qryArgs[ "yaw" ];
		console.log( "_yaw:"+_yaw );
	}
	if ( _qryArgs[ "pitch" ] ) { } // also do pitch/roll at some point
	if ( _qryArgs[ "roll" ] ) { }

	if ( _qryArgs[ "fov" ] ) {
		_fov = _qryArgs[ "fov" ];
		console.log( "_fov:"+_fov );
	}

	_websocket.onopen = function () {
		_wsConnected = true;
		// ask relay to resend last pov message
	}
	_websocket.onclose = function () { _wsConnected = false; }

	if (_slave) { // only slaves respond to inbound ws messages
		_websocket.onmessage = function ( evt ) {
			//console.log("evt:"+evt.data);
			var camData = JSON.parse( evt.data );
			_position = camData.p;
			_quaternion = camData.q;
		}
	}

	renderer.autoClear = false;

	this.setSize = function ( width, height ) {

		renderer.setSize( width, height );

		_yawRads = _yaw * width/height * Math.PI/180; 
	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === undefined ) camera.updateMatrixWorld();
	
		if ( !_slave ) { // get & send camera position & quaternion via ws
			camera.matrixWorld.decompose( _position, _quaternion, _scale );
			var pov = { p:_position, q:_quaternion };
                        var povMesg = JSON.stringify( pov );
			//console.log("pov:"+povMesg);
			if ( povMesg != _lastMesg && _wsConnected ) { // only if new data and connected
                        	_websocket.send( povMesg ); // needs "pov" prefix
				_lastMesg = povMesg;
			}
		}

		if ( _fov != 0) { camera.fov = _fov; } // always overwrite fov, if set

		camera.updateProjectionMatrix();

		cameraViewSync.projectionMatrix = camera.projectionMatrix;
		cameraViewSync.position.copy( _position ); // for slave can we do these in onmessage?
		cameraViewSync.quaternion.copy( _quaternion );

		if (_yawRads != 0 ) {
			cameraViewSync.rotateOnAxis( _yawAxis, _yawRads );
		}
		// maybe add pitch & roll?

		cameraViewSync.updateMatrixWorld();

		//renderer.clear(); // not needed?

		renderer.render( scene, cameraViewSync );
	};
};

function _getQueryStringVars() {

    var server_variables = {};
    var query_string = window.location.search.split( "?" )[1];
    if ( !query_string ) return false;
    var get = query_string.split( "&" );

    for ( var i = 0; i < get.length; i++ ) {
        var pair = get[ i ].split( "=" );
        server_variables[ pair[0] ] = unescape( pair[1] );
    }

    return server_variables;
}
