const arcgisHost = "https://borgarvefsja.reykjavik.is/";
var map, baseLayer, graphicLayer, latLongSpatialReference, isn93SpatialReference, locationDelegate, featureMap;

function initMapArc(posDelegate = null, featMap = null) {
    locationDelegate = posDelegate
    featureMap = featMap;

    require(
        ["esri/map", "esri/dijit/LocateButton", "esri/SpatialReference", "esri/tasks/ProjectParameters", "esri/geometry/Point", "dojo/domReady!"],
        function (Map, LocateButton, SpatialReference, ProjectParameters, Point) {

            esriConfig.defaults.geometryService = new esri.tasks.GeometryService(arcgisHost + "arcgis/rest/services/Utilities/Geometry/GeometryServer");
            baseLayer = new esri.layers.ArcGISTiledMapServiceLayer(arcgisHost + "arcgis/rest/services/Borgarvefsja/Borgarvefsja/MapServer");
            latLongSpatialReference = new SpatialReference({ wkid: 4326 });
            isn93SpatialReference = new SpatialReference({ wkid: 3057 });

            let initialExtent = new esri.geometry.Extent({ "xmin": 357692, "ymin": 404787, "xmax": 360039, "ymax": 403737, "spatialReference": { "wkid": isn93SpatialReference.wkid } });
            map = new Map("mapDiv", {
                extent: initialExtent,
                logo: false,
                zoom: 3,
            });

            let geoLocatebutton = new LocateButton({
                map: map,
                highlightLocation: true,
                useTracking: true,
                enableHighAccuracy: true,
                scale: 1000,
            }, "LocateButton");
            geoLocatebutton.startup();

            //Þegar kortið er tilbúið er punkti bætt á kortið.
            map.on("load", function () {
                addPointToMap(new Point(-21.907639940283016, 64.11152857653306, latLongSpatialReference));
            });

            //Smellt á kortið til að bæta við punkti.
            map.on("click", function (evt) {
                addPointToMap(new Point(evt.mapPoint.x, evt.mapPoint.y, map.spatialReference));
            });

            //Keyrir þegar notandinn smellir á locate, til að skila punkti, hverfi og næstu götum.
            geoLocatebutton.on("locate", function (evt) {
                addPointToMap(new Point(evt.position.coords.longitude, evt.position.coords.latitude, latLongSpatialReference));
            });

            graphicLayer = new esri.layers.GraphicsLayer();

            //Keyrir þegar smellt er á punkt. Gagnlegt fyrir kóða tilraunir.
            graphicLayer.on("click", function (evt) {
                //var pt = new esri.geometry.Point(evt.graphic.attributes.pX, evt.graphic.attributes.pY, map.spatialReference);
            });

            map.addLayers([baseLayer, graphicLayer]);
        }
    );
}

function addPointToMap(point) {
    if (point.spatialReference.wkid == map.spatialReference.wkid) {
        project(
            [point],
            latLongSpatialReference,
            function (latLongPoints) {
                setPoint(point);
                setLocationInfo(point.x, point.y, latLongPoints[0].x, latLongPoints[0].y);
            }
        );
    } else if (point.spatialReference.wkid == latLongSpatialReference.wkid) {
        project(
            [point],
            map.spatialReference,
            function (mapPoints) {
                setPoint(mapPoints[0]);
                setLocationInfo(mapPoints[0].x, mapPoints[0].y, point.x, point.y);
            }
        );
    } else {
        // throw exception?
    }
}

function setPoint(point) {
    require(
        [
            "esri/symbols/SimpleMarkerSymbol",
            "esri/symbols/SimpleLineSymbol",
            "esri/graphic",
            "esri/Color",
            "dojo/domReady!"
        ],
        function (SimpleMarkerSymbol, SimpleLineSymbol, Graphic, Color) {
            graphicLayer.clear();
            let graphic = new Graphic(point);
            graphic.symbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                10,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1),
                new Color([255, 0, 0, 0.5])
            );
            graphicLayer.add(graphic);
        }
    );
}

function setLocationInfo(x, y, long, lat) {
    if (featureMap) {
        handleFeatureMap.forEach((instructions, key) => { getNearestStreet(x, y, key, instructions.layer, instructions.handler) });
    }
    if (locationDelegate) {
        locationDelegate(x, y, long, lat);
    }
}

function project(geometries, spatialReference, delegate) {
    require(
        ["esri/tasks/ProjectParameters"],
        function (ProjectParameters) {
            var params = new ProjectParameters();
            params.geometries = geometries;
            params.outSR = spatialReference;
            esriConfig.defaults.geometryService.project(
                params,
                delegate
            );            
        }
    );
}

function getNearestStreet(xCoord, yCoord, gpTasksName, bvsLayerId, resultDelegate) {
    require(["esri/tasks/Geoprocessor", "esri/tasks/FeatureSet", "esri/geometry/Point", "esri/graphic", "esri/tasks/QueryTask", "esri/tasks/query"],
        function (Geoprocessor, FeatureSet, Point, Graphic, QueryTask, Query) {
            var params = {};
            var featureSet = new FeatureSet();
            featureSet.features.push(new Graphic(new Point(xCoord, yCoord, map.spatialReference)))
            params.Feature_Set = featureSet;
            var findNearest = new Geoprocessor(arcgisHost + "arcgis/rest/services/Borgarvefsja/FinnaNaestaVidfang/GPServer/" + gpTasksName);
            findNearest.execute(params, function (results) {
                let queryTask = new QueryTask(arcgisHost + "arcgis/rest/services/Borgarvefsja/Borgarvefsja_over/MapServer/" + bvsLayerId);
                let query = new Query();
                query.returnGeometry = false;
                query.outFields = ["*"];
                query.where = "OBJECTID=" + results[0].value.features[0].attributes.NEAR_FID;
                queryTask.execute(query, function (resultFeatureSet) {
                    resultDelegate(resultFeatureSet);
                });
            }, errorHandler);
        }
    );

    function errorHandler(err) {
        console.log("Query error: ", err);
    }
}
