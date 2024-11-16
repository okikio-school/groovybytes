import traceback
from .entity import Entity, CommonAttributesBuilder

class Report(Entity):
    builder = CommonAttributesBuilder()
    try:
        common_attributes = (
            builder.add_attribute(
                "account",
                synonyms=[("account", 1), ("portfolio", 2)]
            ).add_attribute(
                "sales",
                synonyms=[("sales", 1), ("revenue", 1),
                 ("expenses", 2), ("expense", 2),
                 ("sold", 1), ("profit", 2)]
            )
            .add_attribute("currency", [("currency", 2)], fuzzy_map=False)
            .add_attribute(
                "date",
                synonyms=[("date", 1), ("year", 0.5),
                          ("month", 0.5), ("day", 0.5)],
                fuzzy_match=True
            ).build()
        )
    except AttributeError:
        CommonAttributesBuilder.invalid_attribute(__name__, traceback.format_exc())


    def __init__(self):
        self.data = {
            "account": None,
            "currency": None,
            "sales": None,
            "expenses": None,
            "profit": None,
            "sold": None,
            "revenue": None,
            "filename": None,
        }

    def add_data(self, data):
        self.data = Entity.match_headers(data, self.common_attributes, self.data)

    @classmethod
    def score_attributes(cls, headers):
        return Entity.score_attributes(headers, cls.common_attributes)

