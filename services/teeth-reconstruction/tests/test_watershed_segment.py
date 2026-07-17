from pathlib import Path

from pipeline.watershed_segment import segment_teeth_watershed

ASSETS = Path(__file__).resolve().parents[3] / ".cursor/projects/Users-varshilmehta-varshil-mehta-airway-webapp/assets"


def test_watershed_returns_teeth_for_intraoral_closeup():
    image_path = ASSETS / "image-0fc035be-fe15-4493-ad10-9d05429a1662.png"
    if not image_path.exists():
        return

    result = segment_teeth_watershed(image_path.read_bytes())
    assert result is not None
    assert result["engine"] == "watershed_enamel"
    assert len(result["teeth"]) >= 6

    upper = [tooth for tooth in result["teeth"] if tooth["arch"] == "upper"]
    lower = [tooth for tooth in result["teeth"] if tooth["arch"] == "lower"]
    assert len(upper) >= 4
    assert len(lower) >= 2

    for tooth in result["teeth"]:
        assert len(tooth["polygon"]) >= 3

    assert result.get("instanceMaskPngBase64")
