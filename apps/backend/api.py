from flask import Flask
from flask_restful import Resource,Api,reqparse


app = Flask(__name__)
api = Api(app)



class Experiment(Resource):
    pass


api.add_resource(Experiment,'/experiment')



if __name__ == '__main__':
    app.run()
