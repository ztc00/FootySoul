// Web stub for react-native-maps — native module not available on web
const { View } = require('react-native');
const React = require('react');

const MapView = (props) => React.createElement(View, props);
MapView.Animated = MapView;
const Marker = (props) => React.createElement(View, props);
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
