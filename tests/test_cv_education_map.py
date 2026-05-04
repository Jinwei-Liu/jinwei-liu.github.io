import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


def load_yaml(relative_path):
    return yaml.safe_load(read_text(relative_path))


class CvEducationMapTests(unittest.TestCase):
    def test_cv_page_does_not_load_leaflet_for_education_map(self):
        cv_page = read_text("_pages/cv.md")

        self.assertNotRegex(cv_page, r"(?m)^map:\s*true\s*$")

    def test_education_template_renders_static_map(self):
        template = read_text("_includes/cv/education.liquid")

        self.assertIn("cv-education-static-map", template)
        self.assertIn("cv-education-static-map-canvas", template)
        self.assertIn("cv-education-static-marker", template)
        self.assertIn("site.data.education_locations[entry.institution]", template)
        self.assertIn("{% include cv/china_education_map.svg %}", template)
        self.assertIn('aria-label="Education locations in China"', template)

        self.assertNotIn("cv-education-map-marker", template)
        self.assertNotIn("data-latitude", template)
        self.assertNotIn("data-longitude", template)

    def test_static_map_uses_real_vector_data(self):
        map_svg = read_text("_includes/cv/china_education_map.svg")

        self.assertIn("Generated from Natural Earth", map_svg)
        self.assertIn("cv-education-static-province", map_svg)
        self.assertIn("cv-education-static-route", map_svg)
        self.assertGreaterEqual(map_svg.count('class="cv-education-static-province"'), 25)

    def test_static_map_styles_are_present(self):
        styles = read_text("_sass/_cv.scss")

        for selector in [
            ".cv-education-static-map",
            ".cv-education-static-map-canvas",
            ".cv-education-static-map-art",
            ".cv-education-static-sea",
            ".cv-education-static-province",
            ".cv-education-static-city-dot",
            ".cv-education-static-marker",
            ".cv-education-static-pin",
            ".cv-education-static-label",
        ]:
            with self.subTest(selector=selector):
                self.assertIn(selector, styles)

        self.assertNotIn(".cv-education-map.map-tiles-unavailable", styles)

    def test_every_education_entry_has_static_location_data(self):
        cv = load_yaml("_data/cv.yml")
        locations = load_yaml("_data/education_locations.yml")
        education_entries = cv["cv"]["sections"]["Education"]

        for entry in education_entries:
            institution = entry["institution"]
            with self.subTest(institution=institution):
                self.assertIn(institution, locations)
                location = locations[institution]

                for key in ["position_x", "position_y", "label", "city"]:
                    self.assertIn(key, location)
                    self.assertIsInstance(location[key], str)
                    self.assertNotEqual(location[key].strip(), "")

                for key in ["position_x", "position_y"]:
                    self.assertRegex(location[key], r"^\d+(?:\.\d+)?%$")
                    value = float(location[key].removesuffix("%"))
                    self.assertGreaterEqual(value, 0)
                    self.assertLessEqual(value, 100)

    def test_rendercv_data_does_not_include_map_only_coordinates(self):
        cv = load_yaml("_data/cv.yml")
        education_entries = cv["cv"]["sections"]["Education"]
        map_only_fields = {"latitude", "longitude", "lat", "lng", "lon", "coordinates"}

        for entry in education_entries:
            institution = entry["institution"]
            with self.subTest(institution=institution):
                self.assertFalse(map_only_fields.intersection(entry))


if __name__ == "__main__":
    unittest.main()
