// FossFLOW data model types (mirrors fossflow-lib schemas)

export interface Coords {
  x: number;
  y: number;
}

export interface Icon {
  id: string;
  name: string;
  url: string;
  collection?: string;
  isIsometric?: boolean;
  scale?: number;
}

export interface Color {
  id: string;
  value: string;
}

export interface ModelItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ViewItem {
  id: string;
  tile: Coords;
  labelHeight?: number;
}

export interface ConnectorLabel {
  id: string;
  text: string;
  position: number; // 0-100 percentage along path
  height?: number;
  line?: '1' | '2';
  showLine?: boolean;
}

export interface Anchor {
  id: string;
  ref?: {
    item: string;
    anchor: string;
    tile: Coords;
  };
}

export interface Connector {
  id: string;
  description?: string;
  startLabel?: string;
  endLabel?: string;
  startLabelHeight?: number;
  centerLabelHeight?: number;
  endLabelHeight?: number;
  labels?: ConnectorLabel[];
  color?: string;
  customColor?: string;
  width?: number;
  style?: 'SOLID' | 'DOTTED' | 'DASHED';
  lineType?: 'SINGLE' | 'DOUBLE' | 'DOUBLE_WITH_CIRCLE';
  showArrow?: boolean;
  anchors: Anchor[];
}

export interface TextBox {
  id: string;
  tile: Coords;
  width: number;
  height: number;
  text: string;
  color?: string;
}

export interface Rectangle {
  id: string;
  tile: Coords;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
}

export interface View {
  id: string;
  lastUpdated?: string;
  name: string;
  description?: string;
  items: ViewItem[];
  rectangles?: Rectangle[];
  connectors?: Connector[];
  textBoxes?: TextBox[];
}

export interface DiagramData {
  version?: string;
  title: string;
  description?: string;
  icons: Icon[];
  colors: Color[];
  items: ModelItem[];
  views: View[];
}

// WebSocket protocol types

export interface OperationMessage {
  type: 'operation';
  id: string;
  operation: 'add_node' | 'connect' | 'move' | 'delete' | 'undo' | 'redo';
  payload: AddNodePayload | ConnectPayload | MovePayload | DeletePayload;
}

export interface AddNodePayload {
  name: string;
  icon: string; // icon ID
  position?: Coords; // optional, auto-place if omitted
}

export interface ConnectPayload {
  fromItemId: string;
  toItemId: string;
  label?: string;
  style?: 'SOLID' | 'DOTTED' | 'DASHED';
  color?: string;
}

export interface MovePayload {
  itemId: string;
  position: Coords;
}

export interface DeletePayload {
  elementId: string;
  elementType: 'item' | 'connector' | 'textBox' | 'rectangle';
}

export interface StateUpdateMessage {
  type: 'state_update';
  diagram: DiagramData;
  operationId?: string;
}

export interface OperationResultMessage {
  type: 'operation_result';
  id: string;
  success: boolean;
  error?: string;
  createdId?: string;
}
