// Polyfills
import 'es6-object-assign/auto';
import 'core-js/fn/array/includes';
import 'core-js/fn/promise/finally';
import 'intl'; // For Safari 9

import './xhr';
import './inject';

import React from 'react';
import ReactDOM from 'react-dom';
import {compose} from 'redux';

import AppStateHOC from '../../lib/app-state-hoc.jsx';
import GUI from '../../containers/gui.jsx';
import {drmer} from '@pipijr/core';
import NativeHOC from './native-hoc.jsx';

import styles from './index.css';

const appTarget = document.getElementById('app');
appTarget.className = styles.app;

GUI.setAppElement(appTarget);

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedGui = compose(
    AppStateHOC,
    NativeHOC
)(GUI);

const inApp = window.navigator.userAgent.indexOf('Scratch') > -1;
const render = () => {
    ReactDOM.render(<WrappedGui />, appTarget);
};

if (inApp) {
    drmer.onReady(render);
} else {
    render();
}
