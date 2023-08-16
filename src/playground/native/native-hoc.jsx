import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import React from 'react';
import PropTypes from 'prop-types';
import {drmer} from '@pipijr/core';
import {connect} from 'react-redux';
import log from '../../lib/log';

import {
    LoadingStates,
    onFetchedProjectData,
    onLoadedProject,
    defaultProjectId,
    requestNewProject,
    requestProjectUpload,
    setProjectId
} from '../../reducers/project-state';
import {
    openLoadingProject,
    closeLoadingProject
} from '../../reducers/modals';

import LocalStorageHelper from './local-storage-helper';
import NativeStorageHelper from './native-storage-helper.js';
import NativeLinkSocket from './native-link-socket';

/* Higher Order Component to get the project id from location.hash
 * @param {React.Component} WrappedComponent: component to render
 * @returns {React.Component} component with hash parsing behavior
 */
const NativeHoc = function (WrappedComponent) {
    class NativeComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'handleStorageInit',
                'linkSocketFactory',
                'handleVMInit',
                'handleClickLogo'
            ]);
        }

        componentDidMount () {
            if (drmer.bridge) {
                this.loadProject();
            } else {
                this.props.setProjectId(defaultProjectId);
            }
        }

        async loadProject () {
            const data = await drmer.callJson('DocumentService@loadProject');
            const hasInitialProject = !!data;

            this.props.onHasInitialProject(
                hasInitialProject,
                this.props.loadingState
            );

            if (!hasInitialProject) {
                this.props.setProjectId(defaultProjectId);

                return;
            }

            this.props.vm.loadProject(data)
                .then(
                    () => {
                        this.props.onLoadingCompleted();
                        // this.props.onLoadedProject(this.props.loadingState, true);
                    },
                    () => {
                        this.props.onLoadingCompleted();
                        this.props.onLoadedProject(this.props.loadingState, false);

                        // this effectively sets the default project ID
                        // TODO: maybe setting the default project ID should be implicit in `requestNewProject`
                        this.props.onHasInitialProject(false, this.props.loadingState);

                        // restart as if we didn't have an initial project to load
                        this.props.onRequestNewProject();
                    }
                );
        }

        handleStorageInit (storage) {
            storage.addOfficialScratchWebStores();
            storage.addHelper(new LocalStorageHelper(storage), 50);
            storage.addHelper(new NativeStorageHelper(storage));
        }

        linkSocketFactory (type) {
            return new NativeLinkSocket(type);
        }

        handleClickAbout () {
            log.debug('About');
        }

        async handleClickLogo () {
            drmer.run('CameraService@stop');
            const SPLITTER = ';base64,';
            const {vm} = this.props;
            const projectData = vm.toJSON();

            // update assets
            const assets = vm.assets;
            const assetIds = [];

            for (const assetKey in this.props.vm.assets) {
                const asset = assets[assetKey];
                const name = `${asset.assetId}.${asset.dataFormat}`;

                assetIds.push(name);

                const exists = await drmer.call('AssetService@exists', name);

                if (!exists) {
                    const dataUri = asset.encodeDataURI();

                    await drmer.call('AssetService@save', {
                        name: name,
                        data: dataUri.substring(dataUri.indexOf(SPLITTER) + SPLITTER.length)
                    });
                }
            }

            await drmer.call('AssetService@preserve', assetIds);

            // update project
            await drmer.call('DocumentService@save', projectData);
            vm.quit();
            drmer.run('DocumentService@close');
        }

        handleVMInit (vm) {
            vm.configureScratchLinkSocketFactory(this.linkSocketFactory);
        }

        render () {
            const childProps = omit(
                this.props,
                Object.keys(NativeComponent.propTypes)
            );
            return (
                <WrappedComponent
                    canEditTitle={false}
                    canModifyCloudData={false}
                    canSave={false}
                    canChangeLanguage
                    canChangeTheme={false}
                    backpackVisible={false}
                    backpackHost={'native:BackpackService'}
                    isScratchDesktop={false}
                    canShare={false}
                    isTotallyNormal={false}
                    onClickAbout={this.handleClickAbout}
                    onStorageInit={this.handleStorageInit}
                    onClickLogo={this.handleClickLogo}
                    onVmInit={this.handleVMInit}
                    canManageFiles={false}
                    {...childProps}
                />
            );
        }
    }

    NativeComponent.propTypes = {
        setProjectId: PropTypes.func,
        loadingState: PropTypes.oneOf(LoadingStates),
        onFetchedInitialProjectData: PropTypes.func,
        onHasInitialProject: PropTypes.func,
        onLoadedProject: PropTypes.func,
        onLoadingCompleted: PropTypes.func,
        onLoadingStarted: PropTypes.func,
        onRequestNewProject: PropTypes.func,
        // eslint-disable-next-line react/forbid-prop-types
        session: PropTypes.any,
        // eslint-disable-next-line react/forbid-prop-types
        vm: PropTypes.any
    };
    const mapStateToProps = state => ({
        loadingState: state.scratchGui.projectState.loadingState,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = dispatch => ({
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        onLoadingStarted: () => dispatch(openLoadingProject()),
        onLoadingCompleted: () => dispatch(closeLoadingProject()),
        onHasInitialProject: (hasInitialProject, loadingState) => {
            if (hasInitialProject) {
                // emulate sb-file-uploader
                return dispatch(requestProjectUpload(loadingState));
            }

            // `createProject()` might seem more appropriate but it's not a valid state transition here
            // setting the default project ID is a valid transition from NOT_LOADED and acts like "create new"
            return dispatch(setProjectId(defaultProjectId));
        },
        onFetchedInitialProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        onLoadedProject: (loadingState, canSave, loadSuccess) => {
            const canSaveToServer = false;

            return dispatch(
                onLoadedProject(loadingState, canSaveToServer, loadSuccess)
            );
        },
        onRequestNewProject: () => dispatch(requestNewProject(false))
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(NativeComponent);
};

export {
    NativeHoc as default
};
