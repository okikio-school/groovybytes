import re
from rapidfuzz import fuzz



class CommonAttributesBuilder:
    def __init__(self):
        self.attributes = {}

    def add_attribute(self, name, synonyms, fuzzy_map=False, fuzzy_match=False, fuzz_map={}):

        if fuzzy_map and not fuzz_map:
            print(f'Attribute "{name}" has no fuzz_map associated with it.')
            print(f'If the fuzz_map attribute is set to "True" you must provide the'
                  f'fuzz_map attribute with it.\n"fuzz_map" should be a dictionary with the mapping'
                  f'constraints.')
            return None

        for i, synonym in enumerate(synonyms):
            if not isinstance(synonym, tuple):
                print(f'Invalid synonym provided: "{synonym}"')
                print(f'synonyms must have an associated weight with them:\n'
                      "['<your_synonym>, <weight>']")
                return None

            synonyms[i] = (preprocess_string(synonym[0]), synonym[1])

        self.attributes[name] = {
            "synonyms": synonyms,
            "fuzzy_map": fuzzy_map,
            "fuzzy_match": fuzzy_match,
            "fuzz_map": fuzz_map
        }

        return self

    def build(self):
        return self.attributes

    @staticmethod
    def invalid_attribute(name, e):
        print(f'Invalid attribute provided in the {name} class.\n'
              f'PLease check the attributes you provided and try again.')
        print(f'Error:\n{e}')
        exit(9)


class Entity:

    @staticmethod
    def attributes_builder(attributes, synonyms):
        print("builds attributes")

    @staticmethod
    def score_attributes(headers, attributes):
        score = 0
        for header in headers:
            header = preprocess_string(header)
            for (attribute, properties) in attributes.items():
                max_weight = 0
                current_score = 0
                for synonym_property in properties["synonyms"]:
                    synonym, weight = synonym_property
                    pattern = r'\b' + re.escape(synonym) + r'\b'
                    if re.match(pattern, header, re.IGNORECASE):
                        current_score = 100 * weight
                        break

                    similarity = fuzz.ratio(header, synonym)
                    if similarity > 80 and weight > max_weight:
                        max_weight = weight
                        current_score = similarity * weight
                score += current_score

        return score / 100

    @staticmethod
    def match_headers(data, common_attributes, entity_data):
        headers = list(data.keys())
        for header in headers:
            processed_header = preprocess_string(header)
            found = False
            for attribute, properties in common_attributes.items():
               attribute = preprocess_string(attribute)
               synonyms = properties["synonyms"]
               fuzzy_match = properties["fuzzy_match"]
               fuzzy_map = properties["fuzzy_map"]
               fuzz_map = properties["fuzz_map"]
               for synonym, _ in synonyms:
                   if processed_header == synonym:
                       found = True
                       if fuzzy_map:
                           if synonym in fuzz_map:
                               mapped_name  = fuzz_map[synonym]
                               update_entity_data(entity_data, mapped_name, data[header])
                               break
                           else:
                               update_entity_data(entity_data, processed_header, data[header])
                               break
                       elif not fuzzy_match:
                           update_entity_data(entity_data, attribute, data[header])
                           break
                       else:
                           update_entity_data(entity_data, synonym, data[header])
                           break
               if found:
                   break
            if not found:
                update_entity_data(entity_data, processed_header, data[header])

        return entity_data

def update_entity_data(entity_data, key, value):
    if key in entity_data:
        entity_data[key] = value
    else:
        if "other" in entity_data:
            entity_data["other"].append({key: value})
        else:
            entity_data["other"] = [{key: value}]
    return entity_data

def preprocess_string(string):
    string = string.strip().lower()
    string = re.sub(r'\s+', " ", string)
    return string