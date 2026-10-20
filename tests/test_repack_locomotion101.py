"""Mechanical extraction must preserve drawn pixels and anatomical geometry."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location(
    "repack", Path(__file__).resolve().parents[1] / "scripts/repack-locomotion101.py")
repack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repack)


class RepackTests(unittest.TestCase):
    def sheet(self):
        pixels = np.zeros((240, 240, 4), dtype=np.uint8)
        # Vertical extents overlap across the nominal y120 grid seam.
        boxes = [(10, 10, 55, 135), (130, 10, 175, 135),
                 (65, 110, 110, 235), (185, 110, 230, 235)]
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            pixels[y0:y1, x0:x1] = [40 + i * 30, 80, 120, 200 + i]
        return Image.fromarray(pixels), boxes

    def test_cross_row_pixels_belong_to_their_whole_character(self):
        image, boxes = self.sheet()
        sprites, parts, omitted = repack.extract(image, [2, 2])
        self.assertEqual([p["box"] for p in parts], [list(b) for b in boxes])
        self.assertEqual([sprite.size for sprite in sprites], [(45, 125)] * 4)
        self.assertEqual(omitted, [])

    def test_every_kept_rgba_pixel_is_unchanged(self):
        image, boxes = self.sheet()
        sprites, _, _ = repack.extract(image, [2, 2])
        for sprite, box in zip(sprites, boxes):
            np.testing.assert_array_equal(np.array(sprite), np.array(image.crop(box)))

    def test_touching_characters_fail_instead_of_being_guessed(self):
        image, _ = self.sheet()
        pixels = np.array(image)
        pixels[115:125, 50:70] = [10, 20, 30, 255]
        with self.assertRaisesRegex(ValueError, "connected objects"):
            repack.extract(Image.fromarray(pixels), [2, 2])

    def test_diagonal_pixel_adjacency_keeps_one_component(self):
        mask = np.eye(5, dtype=bool)
        parts = repack.components(mask)
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0]["area"], 5)
        self.assertEqual(parts[0]["box"], [0, 0, 5, 5])


if __name__ == "__main__":
    unittest.main()
