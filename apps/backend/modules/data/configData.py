from pydantic import BaseModel, validator


class ConfigData(BaseModel):
    data: dict

    @validator('data')
    @classmethod
    def check_config_data(cls, v):
        if v == {}:
            print("Data for this config is empty, Decide if this is allowed")
        return v