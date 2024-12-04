import Joi from 'joi';

const intschema = Joi.object().keys({
	name: Joi.string().required(),
	default: Joi.number().required().integer(),
	min: Joi.number().required().integer(),
	max: Joi.number().required().integer().greater(Joi.ref('min')),
	step: Joi.number().required().integer(),
	type: Joi.string().valid('integer'),
});

const floatschema = Joi.object().keys({
	name: Joi.string().required(),
	default: Joi.number().required(),
	min: Joi.number().required(),
	max: Joi.number().required().greater(Joi.ref('min')),
	step: Joi.number().required(),
	type: Joi.string().valid('float'),
});

const strschema = Joi.object().keys({
	name: Joi.string().required(),
	default: Joi.boolean().required(),
	type: Joi.string().valid('string'),
});

const boolschema = Joi.object().keys({
	name: Joi.string().required(),
	default: Joi.boolean().required(),
	type: Joi.string().valid('bool'),
});

const stringlistschema = Joi.object().keys({
	name: Joi.string().required(),
	default: Joi.string().required(),
	type: Joi.string().valid('stringlist'),
	values: Joi.array().items(Joi.string().required()),
});

export const emailSchema = Joi.string()
	.email({ tlds: { allow: false } });

export const experimentSchema = Joi.object().keys({
	name: Joi.string().required(),
	description: Joi.string(),
	verbose: Joi.boolean(),
	hyperparameters: Joi.array().items(intschema, floatschema, boolschema, strschema, stringlistschema),
	workers: Joi.number().integer().required(),
});

export const signUpSchema = Joi.object().keys({
	email: emailSchema.required(),
	password: Joi.string().required(),
	passwordRepeat: Joi.string().required().valid(Joi.ref('password')).messages({
		'*': 'Make sure your passwords match',
	}),
});

export const signInSchema = Joi.object().keys({
	email: emailSchema.required(),
	password: Joi.string().required(),
});
