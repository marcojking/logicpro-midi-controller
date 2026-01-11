/**
 * WebRTC Sync for Phone-to-Mac communication
 * Uses PeerJS for simple WebRTC with cloud signaling
 */

class RemoteSync {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.peerId = null;
        this.onSliderChange = null;
        this.onConnectionChange = null;
        this.onError = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Initialize as host (Mac browser)
     * @returns {Promise<string>} The peer ID to share with phone
     */
    async initAsHost() {
        this.isHost = true;

        return new Promise((resolve, reject) => {
            // Generate a simple 4-character room code
            const roomCode = this.generateRoomCode();

            // Load PeerJS from CDN if not loaded
            this.loadPeerJS().then(() => {
                this.peer = new Peer(roomCode, {
                    debug: 1
                });

                this.peer.on('open', (id) => {
                    this.peerId = id;
                    console.log('[Sync] Host ready with ID:', id);
                    resolve(id);
                });

                this.peer.on('connection', (conn) => {
                    console.log('[Sync] Phone connected');
                    this.connection = conn;
                    this.setupConnection(conn);
                });

                this.peer.on('error', (err) => {
                    console.error('[Sync] Peer error:', err);
                    if (err.type === 'unavailable-id') {
                        // ID taken, generate new one
                        this.peer.destroy();
                        this.initAsHost().then(resolve).catch(reject);
                    } else {
                        this.handleError(err.message);
                        reject(err);
                    }
                });

                this.peer.on('disconnected', () => {
                    console.log('[Sync] Disconnected from signaling server');
                    this.attemptReconnect();
                });
            }).catch(reject);
        });
    }

    /**
     * Initialize as client (Phone browser)
     * @param {string} hostId - The room code from the Mac
     * @returns {Promise<void>}
     */
    async initAsClient(hostId) {
        this.isHost = false;

        return new Promise((resolve, reject) => {
            this.loadPeerJS().then(() => {
                this.peer = new Peer({
                    debug: 1
                });

                this.peer.on('open', () => {
                    console.log('[Sync] Connecting to host:', hostId);

                    const conn = this.peer.connect(hostId.toUpperCase(), {
                        reliable: true
                    });

                    conn.on('open', () => {
                        console.log('[Sync] Connected to host');
                        this.connection = conn;
                        this.setupConnection(conn);
                        resolve();
                    });

                    conn.on('error', (err) => {
                        this.handleError(err.message);
                        reject(err);
                    });
                });

                this.peer.on('error', (err) => {
                    console.error('[Sync] Peer error:', err);
                    this.handleError(err.message);
                    reject(err);
                });

                // Timeout for connection
                setTimeout(() => {
                    if (!this.connection) {
                        reject(new Error('Connection timeout. Check the room code and try again.'));
                    }
                }, 10000);
            }).catch(reject);
        });
    }

    /**
     * Setup connection event handlers
     * @param {DataConnection} conn 
     */
    setupConnection(conn) {
        conn.on('data', (data) => {
            this.handleMessage(data);
        });

        conn.on('close', () => {
            console.log('[Sync] Connection closed');
            this.connection = null;
            if (this.onConnectionChange) {
                this.onConnectionChange(false);
            }
        });

        conn.on('error', (err) => {
            console.error('[Sync] Connection error:', err);
            this.handleError(err.message);
        });

        if (this.onConnectionChange) {
            this.onConnectionChange(true);
        }
    }

    /**
     * Handle incoming messages
     * @param {object} data 
     */
    handleMessage(data) {
        if (data.type === 'slider') {
            if (this.onSliderChange) {
                this.onSliderChange(data.id, data.value);
            }
        } else if (data.type === 'fullState') {
            // Host sends full state to phone on connect
            if (this.onFullState) {
                this.onFullState(data.sliders);
            }
        } else if (data.type === 'transport') {
            // Transport control from phone
            if (this.onTransport) {
                this.onTransport(data.action, data.state);
            }
        } else if (data.type === 'ping') {
            this.send({ type: 'pong' });
        }
    }

    /**
     * Send slider change to remote
     * @param {number} id - Slider ID
     * @param {number} value - Slider value (0-1)
     */
    sendSliderChange(id, value) {
        this.send({
            type: 'slider',
            id: id,
            value: value
        });
    }

    /**
     * Send full state (host to client)
     * @param {Array} sliders 
     */
    sendFullState(sliders) {
        this.send({
            type: 'fullState',
            sliders: sliders
        });
    }

    /**
     * Send data to the connected peer
     * @param {object} data 
     */
    send(data) {
        if (this.connection && this.connection.open) {
            this.connection.send(data);
        }
    }

    /**
     * Check if connected to a peer
     * @returns {boolean}
     */
    isConnected() {
        return this.connection && this.connection.open;
    }

    /**
     * Generate a simple 4-character room code
     * @returns {string}
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Attempt to reconnect to signaling server
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.handleError('Failed to reconnect after multiple attempts');
            return;
        }

        this.reconnectAttempts++;
        console.log(`[Sync] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (this.peer && !this.peer.destroyed) {
                this.peer.reconnect();
            }
        }, 2000 * this.reconnectAttempts);
    }

    /**
     * Load PeerJS library dynamically
     * @returns {Promise<void>}
     */
    loadPeerJS() {
        return new Promise((resolve, reject) => {
            if (window.Peer) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load PeerJS'));
            document.head.appendChild(script);
        });
    }

    /**
     * Handle errors
     * @param {string} message 
     */
    handleError(message) {
        console.error('[Sync]', message);
        if (this.onError) {
            this.onError(message);
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.connection = null;
        this.peer = null;
        this.peerId = null;
    }
}

// Export
window.RemoteSync = RemoteSync;
