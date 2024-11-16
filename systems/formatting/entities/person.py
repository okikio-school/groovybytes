from .entity import Entity, CommonAttributesBuilder
import traceback

class Person:
    builder = CommonAttributesBuilder()
    try:
        common_attributes = (
            builder.add_attribute(
                "name",
                synonyms=[("name", 1), ("full name", 1),
                          ("employee name", 0.5), ("last name", 1), ("lastname", 1),("lname", 1),
                          ("first name", 1), ("firstname", 1), ("fname", 1), ('customer', 0.5),
                          ('customer name', 0.5)],
                fuzzy_map=True,
                fuzzy_match=True,
                fuzz_map={
                    "full name": "name",
                    "fname": "first name",
                    "lname": "last name",
                    "firstname": "first name",
                    "lastname": "last name",
                    "employee name": "name",
                    "customer name": "name",
                    "customer": "name"
                }
            ).add_attribute(
                "email",
                synonyms=[("email", 1), ("email address", 1),
                          ("mail", 0.5)]
            ).add_attribute(
                "phone",
                synonyms=[("phone", 1), ("phone number", 1),
                          ("telephone", 1), ("telephone number", 1),
                          ("mobile number", 1)],
                fuzzy_match=True,
            ).add_attribute(
                "job",
                synonyms=[("job", 1), ("work", 0.5),
                          ("occupation", 1), ("profession", 1), ("company", 0.5),
                          ("industry", 0.5)])
            .add_attribute("ethnicity", synonyms=[("ethnicity", 2)])
            .add_attribute("race", synonyms=[("race", 2)])
            .add_attribute("nationality", synonyms=[("nationality", 1)])
            .add_attribute("birthday", synonyms=[("birthday", 3), ("date of birth", 3)])
            .add_attribute("age", synonyms=[("age", 1)])
            .add_attribute("location",
                           synonyms=[("location", 0.5), ("address", 0.5),
                                     ("country", 0.5), ('city', 0.5)],
                           fuzzy_match=True)
            .add_attribute("sex", [("sex", 2)])
            .add_attribute("gender", [("gender", 2)])
            .build()
        )
    except AttributeError:
        CommonAttributesBuilder.invalid_attribute(__name__, traceback.format_exc())


    def __init__(self):
        self.data = {
            "name": None,
            "full name": None,
            "first name": None,
            "last name": None,
            "sex": None,
            "gender": None,
            "age": None,
            "birthday": None,
            "race": None,
            "ethnicity": None,
            "nationality": None,
            "job": None,
            "address": None,
            "location": None,
            "country": None,
            "city": None,
            "email": None,
            "phone": None,
            "filename": None,
        }

    def add_data(self, data):
        self.data = Entity.match_headers(data, self.common_attributes, self.data)

    @classmethod
    def score_attributes(cls, headers):
        return Entity.score_attributes(headers, cls.common_attributes)




