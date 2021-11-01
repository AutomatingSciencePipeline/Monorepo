from flask import Flask
from flask_restful import Resource,Api,reqparse
import json


class Experiment(Resource):
    def get(self):
        # retrieve data from db
        pass

    def post(self):
        args =  [('eid',False), ('name',False),('vars',True)]
        parser = init_request_parser(args)
        args = parser.parse_args()
        return {
            'message': f'Okay. Data for {args["name"] if args["name"] else "new experiment"} has been added',
            'data': args
        }, 200


def init_request_parser(args):
    parser = reqparse.RequestParser()
    for arg,is_required in args:
        parser.add_argument(arg,required=is_required)
    return parser
    



app = Flask(__name__)
api = Api(app)
api.add_resource(Experiment,'/experiment')



if __name__ == '__main__':
    app.run()
