import React, { Component } from 'react';
import _ from "lodash";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import gtag from '../gtag.js';

import Fab from '@material-ui/core/Fab';
import GpsFixed from '@material-ui/icons/GpsFixed';
import GpsOff from '@material-ui/icons/GpsOff';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';

import './Map.scss';
import config from "../custom/config";

const placeholderImage = process.env.PUBLIC_URL + "/custom/images/logo.svg";

const CENTER = [-0.07, 51.58];
const ZOOM = 10;

class Map extends Component {

  constructor(props) {
    super(props);
    this.state = {
      openDialog: false,
      feature: {
        properties: {
          updated: {}
        },
        geometry: {
          coordinates:{}
        }
      }
    }
    this.prevZoom = ZOOM;
    this.prevZoomTime = new Date().getTime();
    this.map = {};
    this.renderedThumbnails = {};
  }

  async componentDidMount(){
    const location = this.props.location;

    mapboxgl.accessToken = config.MAPBOX_TOKEN;
    this.map = new mapboxgl.Map({
      container: 'map', // container id
      style: config.MAP_SOURCE,
      center: location.updated ? [location.longitude, location.latitude] : CENTER, // starting position [lng, lat]
      zoom: ZOOM, // starting zoom
      attributionControl: false,
    });

    this.map.addControl(new mapboxgl.AttributionControl({
      compact: true,
      customAttribution: config.MAP_ATTRIBUTION
    }), "bottom-left");

    this.map.on('load', async () => {
      const geojson = await this.props.photos;
      this.addFeaturesToMap(geojson);
    });
  }

  addFeaturesToMap = geojson => {
    this.map.addSource("data", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 40 // Radius of each cluster when clustering points (defaults to 50)
    });

    this.map.addLayer({
        id: "clusters",
        type: "circle",
        source: "data",
        filter: ["has", "point_count"],
        paint: {
            // Use step expressions (https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            "circle-color": [
                "step",
                ["get", "point_count"],
                "#51bbd6",
                100,
                "#f1f075",
                750,
                "#f28cb1"
            ],
            "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                100,
                30,
                750,
                40
            ]
        }
    });

    this.map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "data",
        filter: ["has", "point_count"],
        layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["Source Sans Pro Regular"],
            "text-size": 12
        }
    });

    this.map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "data",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-radius": 0,
        }
    });

    this.map.on('zoom', e => {
      console.log(e);
      // debugger
      const zoom = Math.round(this.map.getZoom());
      const milliSeconds = 1 * 1000;
      const timeLapsed = new Date().getTime() - this.prevZoomTime;

      if (this.prevZoom !== zoom && timeLapsed > milliSeconds) {
        gtag('event', 'Zoom', {
          'event_category' : 'Map',
          'event_label' : zoom + '',
        });
        this.prevZoom = zoom;
      }

      this.prevZoomTime = new Date().getTime();
    });

    this.map.on('moveend', e => {
      gtag('event', 'Moved at zoom', {
        'event_category' : 'Map',
        'event_label' : this.prevZoom + '',
      });
      gtag('event', 'Moved at location', {
        'event_category' : 'Map',
        'event_label' : `${this.map.getCenter()}`,
      });
    });

    this.map.on('render', 'unclustered-point', e => {
      this.updateRenderedThumbails(e.features);
    });

    this.map.on('mouseenter', 'clusters', () => {
        this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'clusters', () => {
        this.map.getCanvas().style.cursor = '';
    });

    this.map.on('click', 'clusters', (e) => {
      gtag('event', 'Cluster Clicked', {
        'event_category' : 'Map',
      });

      const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      this.map.getSource('data').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err)
            return;
        this.map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
        });
      });
    });
  }

  flyToGpsLocation = () => {
    gtag('event', 'Location FAB clicked', {
      'event_category' : 'Map',
    });
    this.map.flyTo({
      center: [this.props.location.longitude, this.props.location.latitude]
    });
  }

  handleDialogClose = () => {
    this.setState({openDialog:false});
  }

  updateRenderedThumbails = (visibleFeatures) =>{
    _.forEach(this.renderedThumbnails, (thumbnailUrl, id) => {
      const exists = !!_.find(visibleFeatures, (feature) => feature.properties.id === id);
      // if it !exist => remove marker object - delete key from dictionary
      if (!exists) {
        this.renderedThumbnails[id].remove();
        delete this.renderedThumbnails[id];
      }
    })

    visibleFeatures.forEach(feature => {
      if (!this.renderedThumbnails[feature.properties.id]) {
        //create a div element - give attributes
        const el = document.createElement('div');
        el.className = 'marker';
        el.id = feature.properties.id;
        el.style.backgroundImage = `url(${feature.properties.thumbnail}), url(${placeholderImage}) `;
        el.addEventListener('click', () => {
          gtag('event', 'Photo Opened', {
            'event_category' : 'Map',
            'event_label' : feature.properties.id,
          });
          this.setState({openDialog:true,feature})
        });
        //create marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat(feature.geometry.coordinates)
          .addTo(this.map);
        //save the marker object to the renderedThumbnails dictionary
        this.renderedThumbnails[feature.properties.id] = marker;
      }
    });
  }

  componentWillUnmount() {
    if (this.map.remove) { this.map.remove(); }
  }

  formatField(value, fieldName) {
    const formater = config.PHOTO_ZOOMED_FIELDS[fieldName];
    if (value) {
      return formater(value);
    }

    return "-";
  }

  render() {
    const { location, welcomeShown } = this.props;
    const feature = this.state.feature;
    const gpsOffline = !location.online;
    const gpsDisabled = !location.updated;

    return (
      <div className={"geovation-map"} style={{ visibility: this.props.visible ? "visible" : "hidden" }}>
          <div id='map' className="map"></div>
          { welcomeShown &&
            <Fab className="location" size="small" onClick={this.flyToGpsLocation} disabled={gpsDisabled}>
              {gpsOffline ? <GpsOff/> : <GpsFixed/>}
            </Fab>
          }

          <Dialog open={this.state.openDialog} onClose={this.handleDialogClose}>
            <DialogContent>
              <img onError={(e) => { e.target.src=placeholderImage}} className={"main-image"} alt={''} src={feature.properties.main}/>
              <Card>
                <CardActionArea>
                  <CardContent>

                    {Object.keys(config.PHOTO_ZOOMED_FIELDS).map(fieldName => (
                      <Typography gutterBottom key={fieldName}>
                        {fieldName} : {this.formatField(feature.properties[fieldName], fieldName)}
                      </Typography>
                    ))}

                  </CardContent>
                </CardActionArea>
              </Card>

            </DialogContent>

          </Dialog>
      </div>
    );
  }
}

export default Map;
