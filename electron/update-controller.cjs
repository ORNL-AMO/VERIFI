// Owns the updater for the lifetime of the main process, independently of windows.
class UpdateController {
    constructor({ updater, publish, log, supported }) {
        this.updater = updater;
        this.publish = publish;
        this.log = log;
        this.supported = supported;
        this.state = { status: supported ? 'idle' : 'unsupported' };
        this.started = false;
        updater.autoDownload = false;
        updater.autoInstallOnAppQuit = false;
        updater.on('checking-for-update', () => this.setState({ status: 'checking' }));
        updater.on('update-available', info => this.setState({ status: 'available', ...this.release(info) }));
        updater.on('update-not-available', () => this.setState({ status: 'current' }));
        updater.on('download-progress', progress => {
            if (this.state.status === 'downloading') {
                this.setState({ ...this.state, percent: Math.min(100, Math.max(0, Number(progress.percent) || 0)) });
            }
        });
        updater.on('update-downloaded', info => this.setState({ status: 'downloaded', ...this.release(info) }));
        updater.on('error', error => this.fail(error));
    }

    release(info) {
        return { version: info.version, releaseName: info.releaseName || info.version };
    }

    setState(state) {
        this.state = state;
        this.publish(state);
    }

    ready() {
        this.publish(this.state);
        if (!this.started) {
            this.started = true;
            return this.check();
        }
    }

    async check() {
        if (!this.supported || ['checking', 'downloading', 'downloaded', 'installing'].includes(this.state.status)) return;
        this.setState({ status: 'checking' });
        try {
            const result = await this.updater.checkForUpdates();
            // Development builds can return null. All release details come from public APIs.
            if (!result) this.setState({ status: 'unsupported' });
        } catch (error) {
            this.fail(error, 'check');
        }
    }

    async download() {
        if (!(this.state.status === 'available' || (this.state.status === 'error' && this.state.operation === 'download'))) return;
        this.setState({ ...this.state, status: 'downloading', percent: 0, message: undefined, operation: undefined });
        try {
            await this.updater.downloadUpdate();
        } catch (error) {
            this.fail(error, 'download');
        }
    }

    install() {
        if (this.state.status !== 'downloaded') return;
        const downloaded = this.state;
        this.setState({ ...downloaded, status: 'installing', message: undefined });
        try {
            this.updater.quitAndInstall(false, true);
        } catch (error) {
            this.log.error('Update installation failed', error);
            this.setState({ ...downloaded, message: 'The update could not be installed. Try restarting again.' });
        }
    }

    fail(error, operation) {
        this.log.error('Electron update failed', error);
        const phase = operation || this.state.operation || (this.state.status === 'downloading' ? 'download' : 'check');
        if (this.state.status === 'installing') {
            this.setState({ ...this.state, status: 'downloaded', message: 'The update could not be installed. Try restarting again.' });
            return;
        }
        this.setState({
            ...this.state, status: 'error', operation: phase,
            message: phase === 'download' ? 'The update could not be downloaded. Check your connection and try again.' : 'VERIFI could not check for updates. Check your connection and try again.'
        });
    }
}

module.exports = { UpdateController };
