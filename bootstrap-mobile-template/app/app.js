(function () {

    // because JSHint told me to
    'use strict';

	jQuery(document).ready(function($) {
		//layer config needs to load base, asgs, and nws layers respectively...use three LayerCollections

		var json_config = [{ 
		   	"type":"LayerCollection",
		   	"name":"Base Layers",
		   	"thelayers" : [
		   		{"type": "Google", "name":"Google Satellite", "options": {"type":google.maps.MapTypeId.SATELLITE, "isBaselayer":"true", "sphericalMercator":"true","transitionEffect":"resize","visibility":false}
                },
                {"type":"XYZ", "name":"OpenStreetMap MapQuest", "url":[
		   			"http://otile1.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile2.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile3.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png",
                    "http://otile4.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png"
                    ], "options": {"isBaselayer":"true", "sphericalMercator":"true","transitionEffect":"resize"}
                }/*,
                {"type": "Google", "name":"Google Terrain", "options": {"type":google.maps.MapTypeId.TERRAIN, "isBaselayer":"true", "sphericalMercator":"true","transitionEffect":"resize","visibility":false}
                },
                {"type": "Google", "name":"Google Streets", "options": {"type":"", "isBaselayer":"true", "sphericalMercator":"true","transitionEffect":"resize","visibility":false}
                },
                {"type": "Google", "name":"Google Hybrid", "options": {"type":google.maps.MapTypeId.HYBRID, "isBaselayer":"true", "sphericalMercator":"true","transitionEffect":"resize","visibility":false}
                },*/
                
		   	]
	   }]

	    var layerHtml = [];
		var asgs_app_layers = [],
		gg = new OpenLayers.Projection('EPSG:4326'),
    	sm = new OpenLayers.Projection('EPSG:900913'),
	    map = new OpenLayers.Map({
	        div: 'map_div',
	        projection: sm,
	        displayProjection: gg,
        	numZoomLevels: 18,
        	controls: [
            	new OpenLayers.Control.Attribution(),
            	new OpenLayers.Control.Navigation(),
            	new OpenLayers.Control.LayerSwitcher()
            ]
	    });
	
	    var lonlat_default = new OpenLayers.LonLat(-78.641585,35.77353);

		scanLayers(json_config);
		//addLayerLoaders(asgs_app_layers);
		console.log(asgs_app_layers)
	    map.addLayers(asgs_app_layers);

	    //initialize map position
		lonlat_default.transform(gg, sm);
		map.setCenter(lonlat_default, 17);
var style = {
    fillColor: '#000',
    fillOpacity: 0.1,
    strokeWidth: 0
};
var vector = new OpenLayers.Layer.Vector('vector');
map.addLayers([vector]);

	var pulsate = function(feature) {
    var point = feature.geometry.getCentroid(),
        bounds = feature.geometry.getBounds(),
        radius = Math.abs((bounds.right - bounds.left)/2),
        count = 0,
        grow = 'up';

    var resize = function(){
        if (count>16) {
            clearInterval(window.resizeInterval);
        }
        var interval = radius * 0.03;
        var ratio = interval/radius;
        switch(count) {
            case 4:
            case 12:
                grow = 'down'; break;
            case 8:
                grow = 'up'; break;
        }
        if (grow!=='up') {
            ratio = - Math.abs(ratio);
        }
        feature.geometry.resize(1+ratio, point);
        vector.drawFeature(feature);
        count++;
    };
    window.resizeInterval = window.setInterval(resize, 50, point, radius);
};

var geolocate = new OpenLayers.Control.Geolocate({
    bind: false,
    geolocationOptions: {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 7000
    }
});
map.addControl(geolocate);
var firstGeolocation = true;
geolocate.events.register("locationupdated",geolocate,function(e) {
	console.log('is it trying')
    vector.removeAllFeatures();
    var circle = new OpenLayers.Feature.Vector(
        OpenLayers.Geometry.Polygon.createRegularPolygon(
            new OpenLayers.Geometry.Point(e.point.x, e.point.y),
            e.position.coords.accuracy/2,
            40,
            0
        ),
        {},
        style
    );
    vector.addFeatures([
        new OpenLayers.Feature.Vector(
            e.point,
            {},
            {
                graphicName: 'cross',
                strokeColor: '#f00',
                strokeWidth: 2,
                fillOpacity: 0,
                pointRadius: 10
            }
        ),
        circle
    ]);
    if (firstGeolocation) {
        map.zoomToExtent(vector.getDataExtent());
        pulsate(circle);
        firstGeolocation = false;
        this.bind = true;
    }
});
geolocate.events.register("locationfailed",this,function() {
    OpenLayers.Console.log('Location detection failed');
});


	    /**
	     * [scanLayers loads json object as a recursive function]
	     * @param  {[object]} jsonS [contains layer collections and settings]
	     * @return {[type]}       [description]
	     */
		function scanLayers(obj) {
			
		    _.map(obj,function(val,key){
		    	if(val['type']=='LayerCollection'){
		    		//console.log(val)
	    	 		//buildLayerControls(val);
	    	 	}
	    	 	if(key=='thelayers') {
	    	 		_.map(val, function(val2,key2){
	    	 			asgs_app_layers.push(createLayers(val2));	    	 			
	    	 		});
	    	 	}
	    	 	if(val instanceof Object) {
	    	 		scanLayers(val);
	    	 	}
	    	 		    	 	
	    	 });

		}
		
		/**
		 * [createLayers create a OpenLayers.Layer object]
		 * @param  {[object]} layerO [layer json object to build layer with]
		 * @return {[OpenLayers.Layer.type]}        [initialized layer object]
		 */
		function createLayers(layerO){
			var tempLayer;
			
			if(layerO.type=='WMS') {
				tempLayer = new OpenLayers.Layer.WMS(layerO.name, layerO.url[0],layerO.params,layerO.options);
				return tempLayer;
			}
			if(layerO.type=='Google') {
				tempLayer = new OpenLayers.Layer.Google(layerO.name,{type:layerO.options.type});
				return tempLayer;
			}
			if(layerO.type=='XYZ') {
				tempLayer = new OpenLayers.Layer.XYZ(layerO.name, layerO.url,layerO.options);
				return tempLayer;
			}
			if(layerO.type=="Vector") {
				if(layerO.options.type=="OWMStations") {
					// Stations
					tempLayer = new OpenLayers.Layer.Vector.OWMStations("Stations");
					tempLayer.options = layerO.options;
					return tempLayer;
				}
				if(layerO.options.type=="OWMWeather") {
					// Current weather
					tempLayer = new OpenLayers.Layer.Vector.OWMWeather("Weather");
				}
			}
				    
	
		
		}
	



		/**
		 * [ click events ]
		 * 
		 * 
		 * 
		 */
		$('.nav').on('click', 'a', function(){
			console.log('click '+$(this).closest('li').index())
			//console
		    $(".mobile-slide .frame").css("transform","translateX("+$(this).closest('li').index() * -33+"%)");
		    $(".nav li").removeClass("active");
		    $(this).closest('li').addClass("active");
		  });

		$('.locate-me').on('click',  function(){
			console.log('locate')
			geolocate.activate(); 
		  });
		

	});



}());