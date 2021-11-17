from flask import Flask, request
from flask_restful import Resource,Api,reqparse
import json
import os
from subprocess import Popen, PIPE, STDOUT, run

app = Flask(__name__)
api = Api(app)

class Experiment(Resource):
    def get(self):
        # retrieve data from db
        parser, args= init_request_parser(args)
        return (f'Experiment{args.eid}' if args.eid else 'All experiments'),200

    def post(self):
        print('hello')
        args =  [('eid',False), ('user',False),('experimentName',False),('parameters',False)]
        parser, args= init_request_parser(args)
        # integrate with DB middleware
        print(f'{args}') 
        run(['python', '../../scripts/testscript.py', '--clean', '1'])
        run(['python', '../../scripts/testscript.py', '--N', '100', '--nitr', '10', '--override', '1'])

        return {
            'message': f'Okay. Data for {args["experimentName"] if args["experimentName"] else "new experiment"} instantiated by {args["user"]} has been added and is being run on the system',
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
