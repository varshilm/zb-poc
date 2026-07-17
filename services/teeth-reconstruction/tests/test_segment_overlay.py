import base64

import cv2
import numpy as np

from pipeline.segment_overlay import build_segmentation_response, render_instance_mask_png_b64


def test_render_instance_mask_black_background_with_filled_polygons():
    teeth = [
        {
            "id": "U1",
            "arch": "upper",
            "polygon": [{"x": 10, "y": 10}, {"x": 40, "y": 10}, {"x": 40, "y": 40}],
        },
        {
            "id": "U2",
            "arch": "upper",
            "polygon": [{"x": 50, "y": 12}, {"x": 80, "y": 12}, {"x": 80, "y": 42}],
        },
    ]

    encoded = render_instance_mask_png_b64(64, 96, teeth)
    assert encoded

    raw = base64.b64decode(encoded)
    bgr = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert bgr is not None
    assert bgr.shape == (64, 96, 3)

    # Black background outside masks
    assert int(bgr[0, 0].max()) == 0
    assert int(bgr[63, 95].max()) == 0

    # Filled instance regions are non-black
    assert int(bgr[20, 20].max()) > 0
    assert int(bgr[22, 60].max()) > 0

    # Distinct instance colors
    assert not np.array_equal(bgr[20, 20], bgr[22, 60])


def test_build_segmentation_response_includes_instance_mask():
    bgr = np.zeros((32, 48, 3), dtype=np.uint8)
    teeth = [
        {
            "id": "L1",
            "arch": "lower",
            "polygon": [{"x": 5, "y": 5}, {"x": 20, "y": 5}, {"x": 20, "y": 20}],
        },
    ]

    response = build_segmentation_response(bgr, teeth, "test_engine")
    assert response["engine"] == "test_engine"
    assert response["overlayPngBase64"]
    assert response["instanceMaskPngBase64"]
