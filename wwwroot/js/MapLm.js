var prot = window.location.href.split("/")[0];
var LM_map, LM_map_div, LM_markerLayer, LM_currentMarker;
var isPostBack = false;

function LM_log(str) {
    'use strict';
    try {
        console.log(str)
    }
    catch (e) {
        //noop
    }
}

function LM_injectCSS(url) {
    'use strict';
    var cssNode = document.createElement('link');
    cssNode.type = 'text/css';
    cssNode.rel = 'stylesheet';
    cssNode.href = url;
    cssNode.media = 'screen';
    document.getElementsByTagName("head")[0].appendChild(cssNode);
}

function LM_injectJS(url) {
    'use strict';
    var agent = navigator.userAgent;
    var docWrite = (agent.match("MSIE") || agent.match("Safari"));
    if (docWrite) {
        document.write("<script src='" + url + "'></script>");
    }
    else {
        var headID = document.getElementsByTagName("head")[0];
        var newScript = document.createElement('script');
        newScript.type = 'text/javascript';
        newScript.src = url;
        headID.appendChild(newScript)
    }
}

(function () {
    'use strict';
    //Inject OpenLayers
    LM_injectJS(prot + '//cdnjs.cloudflare.com/ajax/libs/proj4js/2.6.2/proj4.min.js');
    LM_injectJS(prot + '//mini.loftmyndir.is/dvergur/OpenLayers.js');

    //Inject CSS
    LM_injectCSS(prot + '//mini.loftmyndir.is/dvergur/dvergur.css');
    LM_injectCSS(prot + '//mini.loftmyndir.is/dvergur/theme/default/style.css')
}());


function LM_init(div, view, handler) {
    if (typeof (OpenLayers) === "undefined") {
        //  LM_log("No openlayers lib loaded - deferring load.")
        setTimeout(function () { LM_init(div) }, 100);
        return;
    }
    proj4.defs("EPSG:3057", "+proj=lcc +lat_1=64.25 +lat_2=65.75 +lat_0=65 +lon_0=-19 +x_0=500000 +y_0=500000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    proj4.defs("EPSG:4326", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");

    //Generate HTML
    LM_map_div = document.getElementById(div);
    LM_map_div.style.backgroundColor = '#233E59';

    var map_contents = '<div id="baseSwitcher">' + '<span id="lightsaber" class="map_sel_notselected"><a onclick="javascript:switchBaseLayers();return false;">Kort</a></span>' + '<span id="photo" class="map_sel_selected"><a onclick="javascript:switchBaseLayers();return false;">Mynd</a></span>' + '</div><div id="mapLogoDiv"><a title="Skoða á mini.loftmyndir.is" id=mapLogoImgLink href="#" target=_blank><img alt="mini.loftmyndir.is" border=0 id="mapLogoImg" src=' + prot + '//mini.loftmyndir.is/dvergur/img/map_logo_ljos.png></a>' + '</div><div id="LM_linkDiv"><a id="LM_linkA" href=' + prot + '//3w.loftmyndir.is target=_blank>Â© Loftmyndir ehf.</a></div>'
    LM_map_div.setAttribute('class', 'smallmap')
    LM_map_div.innerHTML = map_contents;
    var arr_scales = [6800000.0, 3400000.0, 1700000.0, 1000000.0, 500000.0, 250000.0, 100000.0, 50000.0, 25000.0, 10000.0, 5000.0, 2000.0, 1000.0, 500.0, 250.0];
    var panBounds = new OpenLayers.Bounds(234248.88, 297273.25, 759064.98, 686298.38);
    LM_map = new OpenLayers.Map(div, {
        theme: null,
        eventListeners: {
            "moveend": function () {
                var ll = LM_map.getCenter();
                var baseLayerCode = LM_map.layers[1].visibility ? '0B' : 'B0';
                var mapZoom = LM_map.layers[0].visibility ? LM_map.zoom + 4 : LM_map.zoom;

            }
        },
        controls: [new OpenLayers.Control.PanPanel({ zoomWorldIcon: true }),
        new OpenLayers.Control.ZoomPanel(),
        new OpenLayers.Control.ZoomPanel(),
        //new OpenLayers.Control.MouseDefaults(),
        new OpenLayers.Control.Navigation({ dragPanOptions: { enableKinetic: true } }),
        new OpenLayers.Control.TouchNavigation()
        ],
        panDuration: 100,
        maxExtent: new OpenLayers.Bounds(0, 0, 1000000, 1000000),
        restrictedExtent: panBounds,
        units: 'm',
        maxResolution: '180/512',
        tileSize: new OpenLayers.Size(512, 512),
        scales: arr_scales,
        projection: "EPSG:3057"
    });
    var tc_servers = ["https://mini.loftmyndir.is/tiles"];

    LM_map.addLayer(new OpenLayers.Layer.WMS("lightsaber", tc_servers,
        { layers: 'kort', format: 'image/jpeg', kortasja: 'test' },
        {
            scales: LM_map.scales.slice(0, 15), singleTile: false, 'isBaseLayer': true, displayInLayerSwitcher: true, attribution: '© Loftmyndir ehf.< small > Allur réttur Áskilinn.</small>',
            transitionEffect: 'resize', buffer: 1
        }));

    LM_map.addLayer(new OpenLayers.Layer.WMS("Myndkort", tc_servers,
        { layers: 'myndkort', format: 'image/jpeg', kortasja: 'test' },
        { scales: LM_map.scales.slice(0, 15), singleTile: false, 'isBaseLayer': true, displayInLayerSwitcher: true, attribution: ' © Loftmyndir ehf.< small > Allur réttur Áskilinn. < /small>', transitionEffect: 'resize', buffer: 1 }))

    LM_markerLayer = new OpenLayers.Layer.Markers("Markers");
    LM_map.addLayer(LM_markerLayer);

    if (view.m) {
        setMarker(view.x, view.y);
    }
    LM_map.setCenter(new OpenLayers.LonLat(view.x, view.y), view.z, false);
    isPostBack = true;

    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
        defaultHandlerOptions: {
            single: true,
            double: true,
            pixelTolerance: 0,
            stopSingle: false,
            stopDouble: true
        },
        initialize: function (options) {
            this.handlerOptions = OpenLayers.Util.extend(
                {},
                this.defaultHandlerOptions
            );
            OpenLayers.Control.prototype.initialize.apply(this, arguments);
            this.handler = new OpenLayers.Handler.Click(
                this,
                {
                    click: this.onClick
                },
                this.handlerOptions
            );
        },
        onClick: function (evt) {
            let xyCoord = LM_map.getLonLatFromPixel(evt.xy).transform(
                new OpenLayers.Projection("EPSG:3057")
            );
            //WGS84/GPS = EPSG:4326 - Pseudo-Mercator/Google = EPSG:3857 / EPSG:900913
            let latLonCoord = proj4("EPSG:3057", "EPSG:4326", { x: xyCoord.lon, y: xyCoord.lat });

            // Set marker and call handler for clicked coordinates
            setMarker(xyCoord.lon, xyCoord.lat);
            handler(xyCoord.lon, xyCoord.lat, latLonCoord.x, latLonCoord.y);
        }
    });

    // Install click handler
    let MapLayerClick = new OpenLayers.Control.Click({
        handlerOptions: {
            single: true,
            double: false,
            stopDouble: false
        }
    });
    LM_map.addControl(MapLayerClick);
    MapLayerClick.activate();
}

function setMarker(x, y) {
    if (LM_currentMarker) {
        LM_markerLayer.removeMarker(LM_currentMarker);
        LM_currentMarker.destroy();
    }
    let size = new OpenLayers.Size(32, 32);
    let offset = new OpenLayers.Pixel(-10, -25);
    let icon = new OpenLayers.Icon('https://mini.loftmyndir.is/img/teiknibola.png', size, offset);
    LM_currentMarker = new OpenLayers.Marker(new OpenLayers.LonLat(x, y), icon);
    LM_markerLayer.addMarker(LM_currentMarker);
}

function switchBaseLayers() {
    var lightsaber_bg_color = "#95ABC0";
    var myndkort_bg_color = "#233E59";
    index = LM_map.layers[0].visibility ? 1 : 0;
    if (index == 1)//lightsaber
    {
        LM_map_div.style.backgroundColor = lightsaber_bg_color;
        document.getElementById("lightsaber").setAttribute('class', 'map_sel_selected');
        document.getElementById("photo").setAttribute('class', 'map_sel_notselected');
        document.getElementById("LM_linkA").style.color = '#3D4043';
    }
    else//myndkort
    {
        LM_map_div.style.backgroundColor = myndkort_bg_color;
        document.getElementById("photo").setAttribute('class', 'map_sel_selected');
        document.getElementById("lightsaber").setAttribute('class', 'map_sel_notselected');
        document.getElementById("LM_linkA").style.color = "#E8E8E8";
    }
    LM_map.setBaseLayer(LM_map.layers[index]);
}
