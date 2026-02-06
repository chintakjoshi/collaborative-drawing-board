export interface Shape {
  id: string;
  type: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  color: string;
  stroke_width: number;
  layer_id: string;
  user_id: string;
}

export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  layer_id: string;
  user_id: string;
  font_size: number;
  font_family: string;
}
