//Note: TRAPPIST-1 only shows 6 planets because the outer one is marked "controversial"
function animate(time) {
	requestAnimationFrame( animate );
	update(time);
	render();

}

function update(time){
	keyboard.update();

	if (params.timeStepFac > 0){
		params.pause = false;
	}

	if ( keyboard.down("Q") ) {
        splashMessage=!splashMessage;
        if (splashMessage){
            showSplash("#splash");
        }
        else{
            hideSplash("#splash");
        }
    }

    //pause the time evolution
	if ( keyboard.down("space") ) {
		params.pause = !params.pause;
		if (params.pause){
			if (params.timeStepFac != 0 && params.timeStepUnit != 0){
				params.saveTimeStepFac = params.timeStepFac;
				flashplaystop("#stop");
				params.timeStepFac = 0.;
			}
			if (inKeplerFlyThrough){
				inKeplerFlyThrough = false;
				controls.enabled = true;
				flashplaystop("#stop");
				KeplerFlyThroughTween.stop();
				KeplerFlyThroughTween1.stop();
				//KeplerFlyThroughTween2.stop();
				KeplerFlyThroughTween3.stop();
				clearInterval(myKeplerRotate);
				clearInterval(myKeplerRotate2);
			}
		} else {
			if (params.timeStepFac == 0 && params.timeStepUnit != 0){
				flashplaystop("#play")
				params.timeStepFac = params.saveTimeStepFac;
			}
		}
		params.resetSlider('timeStepFac', basicGUI, params.timeStepFac);

	}
	if ( keyboard.down("left") ) {
		params.timeStepFac = -1. * Math.abs(params.timeStepFac);
		params.resetSlider('timeStepFac', basicGUI, params.timeStepFac);

	}
	if ( keyboard.down("right") ) {
		params.timeStepFac = Math.abs(params.timeStepFac);
		params.resetSlider('timeStepFac', basicGUI, params.timeStepFac);

	}
	controls.update();
	TWEEN.update(time);
	SunMesh.material.uniforms.cameraCenter.value = camera.position;

	//probably a more efficient way to do this only when camera changes, but this appears to work without slowing things down
	if (showingexott){
		moveExoTooltip();
	}
}

function updateBillboards(){
	coronaMesh.lookAt(camera.position);
	exoplanetsMesh.forEach( function( e, i ) {
		e.lookAt(camera.position);
	} );
}

function render() {
	//console.log(SunEvol.time[iEvol], SunEvol.radius[iEvol])
	camPrev = camDist;
	camDist = CameraDistance();

	//for updating the exoplanets
	if (parseFloat(params.pastYrs) < 2017){
		params.futureMillionYrs = 0.

	}
	if (runningExopDiscYrs && params.pastYrs >= 2017){
		runningExopDiscYrs = false;
		params.timeStepFac = 0.;
		params.resetSlider('timeStepFac', basicGUI, params.timeStepFac);
	}
	if (runningFutureSS && Math.abs(params.futureMillionYrs - maxTime) < 10){
		runningFutureSS = false;
		params.timeStepFac = 0.;
		params.resetSlider('timeStepFac', basicGUI, params.timeStepFac);
	}
	if (!params.pause){
		params.saveTimeStepFac = params.timeStepFac;
	}
	if (params.timeStepUnit == "equal"){//equal mass loss steps
		params.iEvol = THREE.Math.clamp(parseFloat(SuniEvol) + parseFloat(params.timeStepFac), 0, iLength-1);
		params.futureMillionYrs = SunEvol.timeInterp.evaluate(params.iEvol);
		params.futureMillionYrs = Math.min(params.futureMillionYrs, maxTime);
		params.updateSSExop();
	} else {
		params.timeStep = parseFloat(params.timeStepUnit)*parseFloat(params.timeStepFac);
		params.pastYrs = Math.min(parseFloat(params.pastYrs) + parseFloat(params.futureMillionYrs)*1.e6, 2017);
		params.pastYrs += params.timeStep;
		params.pastYrs = Math.min(params.pastYrs, 2017.);
		params.futureMillionYrs += (params.timeStep/1.e6);
		params.futureMillionYrs = Math.min(params.futureMillionYrs, maxTime)
		params.updateSSExop();
	}
	



	//make sure that the billboards are always looking at the camera
	updateBillboards();

	//update the corona/glow size based on the camera position
    var dist,vFoc,height,width;
	if (camDist  > 50.){
     // visible width
		dist = SunMesh.position.distanceTo(camera.position);
		vFOV = THREE.Math.degToRad( camera.fov ); // convert vertical fov to radians
		height = 2 * Math.tan( vFOV / 2 ) * dist; // visible height
		width = height * camera.aspect;  
		coronaMesh.scale.x = width/width0;
		coronaMesh.scale.y = height/height0;
	}


	//I want to set a minimum and maximum size for the exoplanets
	var eScale;
	if (exoplanetsON && !exoplanetsInTweening){
		exoplanetsMesh.forEach( function(l, i){
			if (exoplanets.name[i] != params.GoToExoplanet && Math.abs(exoplanets.yrDiscovered[i]) <= params.pastYrs){
		
				dist = l.position.distanceTo(camera.position);
				vFOV = THREE.Math.degToRad( camera.fov ); // convert vertical fov to radians
				height = 2 * Math.tan( vFOV / 2 ) * dist; // visible height
				width = height * camera.aspect; 
				eScale = 1.;
				if (l.material.uniforms.size.value/width < params.exoplanetMinSize){
					eScale = params.exoplanetMinSize * width / l.material.uniforms.size.value;
				} 	
				if (l.material.uniforms.size.value/width > params.exoplanetMaxSize){
					eScale = params.exoplanetMaxSize * width / l.material.uniforms.size.value;
				} 	
				l.scale.x = eScale;
				l.scale.y = eScale;
				l.material.uniforms.eScale.value = THREE.Math.clamp(eScale, 1., 4.);
				//also if we pull far enough away from the Sun, fade out planets without known distances
				//if there is no distance known, the ringInfo will be negative
				if (Math.sign(exoplanets.ringInfo[i]) < 0){
					l.material.uniforms.exopAlpha.value = Math.min(params.exopAlpha, exopDfac/camDist);
				}

			}
		});
	}

	if (MilkyWayON && !MWInTweening){
		var MWalpha = Math.min(1., Math.max(0., (1. - MWDfac/camDist)));
		MilkyWayMesh.forEach( function( m, i ) {
			m.material.uniforms.MWalpha.value = MWalpha;
		});	
		MWInnerMesh.material.opacity = Math.min(params.MWalpha, Math.max(0., 0.5*MWDfac/camDist));
	}

	//render the scene (with the Milky Way always in the back)
	if (params.renderer != effect) params.renderer.clear();
	params.renderer.render( MWInnerScene, camera );
	params.renderer.render( MWscene, camera );
	if (params.renderer != effect) params.renderer.clearDepth();
	params.renderer.render( scene, camera );




}
