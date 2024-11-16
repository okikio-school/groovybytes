import traceback

from .entity import Entity, CommonAttributesBuilder

class Organization(Entity):
    builder = CommonAttributesBuilder()

    try:
        common_attributes = (
            builder.add_attribute(
                "organization name",
                synonyms=[("name", 0.5), ("organization", 1), ("organization name", 1),
                ("company", 1), ("company name", 1), ("corporation", 1),
                ("corporation name", 1)]
            ).add_attribute(
                "personal name",
                synonyms=[('customer', 0.5), ('customer name', 0.5),
                ("full name", 0.5), ("first name", 0.5), ("fname", 0.5), ("last name", 0.5),
                ("lname", 0.5)],
            ).add_attribute(
                "email",
                synonyms=[("email", 1), ("email address", 1),
                ("mail", 0.5)]
            ).add_attribute(
                "phone",
                synonyms=[("phone", 1), ("phone number", 1),
                  ("telephone", 1), ("telephone number", 1)]
            ).add_attribute(
                "location",
                synonyms=[("location", 0.5), ("address", 0.5), ("country", 0.5), ('city', 0.5)]
            ).add_attribute(
                "industry",
                synonyms=[("industry", 1), ("field", 1)]
            ).add_attribute(
                "employees",
                synonyms=[("employees", 3), ("number of employees", 3), ('employee count', 3)]
            ).add_attribute(
                "founded",
                synonyms=[("founded", 2), ("started", 2), ("started in", 2),
                    ("established", 2), ("established in", 2)],
            ).build()
        )
    except AttributeError:
        CommonAttributesBuilder.invalid_attribute(__name__, traceback.format_exc())

    def __init__(self):
        self.data = {
            "organization name": None,
            "personal name": None,
            "first name": None,
            "last name": None,
            "email": None,
            "location": None,
            "city": None,
            "address": None,
            "country": None,
            "industry": None,
            "employees": None,
            "founded": None,
            "filename": None,
        }

    def add_data(self, data):
        self.data = Entity.match_headers(data, self.common_attributes, self.data)

    @classmethod
    def score_attributes(cls, headers):
        return Entity.score_attributes(headers, cls.common_attributes)
