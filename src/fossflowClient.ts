import WebSocket from 'ws';
import { DiagramData, StateUpdateMessage, OperationResultMessage, OperationMessage } from './types.js';

export interface FossflowClientOptions {
  host?: string;
  port?: number;
  onStateUpdate?: (diagram: DiagramData) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export class FossflowClient {
  private ws: WebSocket | null = null;
  private host: string;
  private port: number;
  private connected = false;
  private diagram: DiagramData | null = null;
  private pendingOperations = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private operationId = 0;

  private onStateUpdate?: (diagram: DiagramData) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: Error) => void;

  constructor(options: FossflowClientOptions = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 3333;
    this.onStateUpdate = options.onStateUpdate;
    this.onConnectionChange = options.onConnectionChange;
    this.onError = options.onError;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.host}:${this.port}`;
      console.error(`[FossflowClient] Connecting to ${url}...`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.error('[FossflowClient] Connected');
        this.connected = true;
        this.onConnectionChange?.(true);
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error('[FossflowClient] Failed to parse message:', err);
        }
      });

      this.ws.on('close', () => {
        console.error('[FossflowClient] Disconnected');
        this.connected = false;
        this.onConnectionChange?.(false);
      });

      this.ws.on('error', (err) => {
        console.error('[FossflowClient] WebSocket error:', err);
        this.onError?.(err);
        if (!this.connected) {
          reject(err);
        }
      });
    });
  }

  private handleMessage(message: any): void {
    console.error('[FossflowClient] Received message type:', message.type);
    if (message.type === 'state_update') {
      const stateMsg = message as StateUpdateMessage;
      console.error('[FossflowClient] State update received, diagram has items:', stateMsg.diagram?.items?.length || 0);
      this.diagram = stateMsg.diagram;
      this.onStateUpdate?.(stateMsg.diagram);

      // Resolve pending operation if this is a response
      if (stateMsg.operationId) {
        const pending = this.pendingOperations.get(stateMsg.operationId);
        if (pending) {
          pending.resolve(stateMsg.diagram);
          this.pendingOperations.delete(stateMsg.operationId);
        }
      }
    } else if (message.type === 'operation_result') {
      const resultMsg = message as OperationResultMessage;
      const pending = this.pendingOperations.get(resultMsg.id);
      if (pending) {
        if (resultMsg.success) {
          pending.resolve(resultMsg);
        } else {
          pending.reject(new Error(resultMsg.error || 'Operation failed'));
        }
        this.pendingOperations.delete(resultMsg.id);
      }
    }
  }

  private async sendOperation(operation: OperationMessage['operation'], payload: any): Promise<any> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to FossFLOW');
    }

    const id = `${++this.operationId}`;
    const message: OperationMessage = {
      type: 'operation',
      id,
      operation,
      payload,
    };

    return new Promise((resolve, reject) => {
      this.pendingOperations.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingOperations.has(id)) {
          this.pendingOperations.delete(id);
          reject(new Error('Operation timeout'));
        }
      }, 30000);
    });
  }

  async addNode(name: string, iconId: string, position?: { x: number; y: number }): Promise<{ nodeId: string }> {
    const result = await this.sendOperation('add_node', {
      name,
      icon: iconId,
      position,
    });
    return { nodeId: result.createdId };
  }

  async connectNodes(fromItemId: string, toItemId: string, label?: string, style?: string, color?: string, fromName?: string, toName?: string): Promise<{ connectorId: string }> {
    const result = await this.sendOperation('connect', {
      fromItemId,
      toItemId,
      fromName,
      toName,
      label,
      style,
      color,
    });
    return { connectorId: result.createdId };
  }

  async moveNode(itemId: string, position: { x: number; y: number }): Promise<void> {
    await this.sendOperation('move', {
      itemId,
      position,
    });
  }

  async deleteElement(elementId: string, elementType: 'item' | 'connector' | 'textBox' | 'rectangle' = 'item'): Promise<void> {
    await this.sendOperation('delete', {
      elementId,
      elementType,
    });
  }

  async undo(): Promise<void> {
    await this.sendOperation('undo', {});
  }

  async redo(): Promise<void> {
    await this.sendOperation('redo', {});
  }

  getDiagram(): DiagramData | null {
    return this.diagram;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}
