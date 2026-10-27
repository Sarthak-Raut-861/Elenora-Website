from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass


# Inheriting from Base tells SQLAlchemy:
# This class represents a table that can be created in the database
# It also provides a base class for all our models to inherit from, which can include common functionality or configurations for all models in the future.