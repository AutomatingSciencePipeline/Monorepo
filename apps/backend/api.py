from flask import Flask, request
from flask_restful import Resource,Api,reqparse
import json

app = Flask(__name__)
api = Api(app)

class Experiment(Resource):
    def get(self):
        # retrieve data from db
        args = [('eid',False)]
        parser, args= init_request_parser(args)
        return (f'Experiment{args.eid}' if args.eid else 'All experiments'),200

    def post(self):
        args =  [('eid',False), ('name',False),('vars',True)]
        parser, args= init_request_parser(args)
        # integrate with DB middleware
        return {
            'message': f'Okay. Data for {args["name"] if args["name"] else "new experiment"} has been added',
            'data': args
        }, 200

@app.route('/', methods=['GET'])
def home():
    return "Welcome to the GLADOS API. Please use the /help endpoint for API documentation.",200

def init_request_parser(args):
    parser = reqparse.RequestParser()
    for arg,is_required in args:
        parser.add_argument(arg,required=is_required)
    return parser,parser.parse_args()
    



api.add_resource(Experiment,'/experiment')



if __name__ == '__main__':
    app.run(debug=True)
