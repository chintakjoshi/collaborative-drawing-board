from dataclasses import dataclass
from typing import List, Optional, Tuple
import math


@dataclass
class Shape:
    id: str
    user_id: str
    layer_id: str
    type: str  # 'rectangle', 'circle', 'line', 'arrow'
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    color: str
    stroke_width: float
    fill_color: Optional[str] = None
    created_at: float = 0


@dataclass
class TextObject:
    id: str
    user_id: str
    layer_id: str
    text: str
    x: float
    y: float
    color: str
    font_size: float = 16
    font_family: str = "Arial"
    created_at: float = 0


class GeometryUtils:
    @staticmethod
    def point_distance(x1: float, y1: float, x2: float, y2: float) -> float:
        return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    
    @staticmethod
    def point_on_line(x: float, y: float, x1: float, y1: float, x2: float, y2: float, tolerance: float = 5) -> bool:
        """Check if point is near a line segment"""
        # Line segment length
        line_length = GeometryUtils.point_distance(x1, y1, x2, y2)
        if line_length == 0:
            return GeometryUtils.point_distance(x, y, x1, y1) <= tolerance
        
        # Find projection point
        t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (line_length ** 2)
        t = max(0, min(1, t))
        
        proj_x = x1 + t * (x2 - x1)
        proj_y = y1 + t * (y2 - y1)
        
        return GeometryUtils.point_distance(x, y, proj_x, proj_y) <= tolerance
    
    @staticmethod
    def point_in_rectangle(x: float, y: float, rect_x: float, rect_y: float, width: float, height: float) -> bool:
        return rect_x <= x <= rect_x + width and rect_y <= y <= rect_y + height
    
    @staticmethod
    def point_in_circle(x: float, y: float, center_x: float, center_y: float, radius: float) -> bool:
        return GeometryUtils.point_distance(x, y, center_x, center_y) <= radius


class EraserEngine:
    def __init__(self):
        self.eraser_width = 20  # Default eraser width
    
    def cut_stroke(self, stroke_points: List[Tuple[float, float]], 
                   eraser_path: List[Tuple[float, float]]) -> List[List[Tuple[float, float]]]:
        """Cut a stroke into segments based on eraser path intersections"""
        if not stroke_points or not eraser_path:
            return [stroke_points]
        
        segments = []
        current_segment = []
        
        for point in stroke_points:
            current_segment.append(point)
            
            # Check if this point is near eraser path
            should_cut = False
            for eraser_point in eraser_path:
                if GeometryUtils.point_distance(point[0], point[1], 
                                              eraser_point[0], eraser_point[1]) <= self.eraser_width:
                    should_cut = True
                    break
            
            if should_cut and len(current_segment) > 1:
                if current_segment:  # Don't add empty segments
                    segments.append(current_segment[:-1])  # Exclude the intersecting point
                current_segment = [point]  # Start new segment from current point
        
        if current_segment:
            segments.append(current_segment)
        
        return segments
