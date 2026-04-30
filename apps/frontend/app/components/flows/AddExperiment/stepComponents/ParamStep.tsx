'use client'

import { Fragment, useCallback, useEffect, useState } from 'react';
import { InputSection } from '../../../InputSection';
//import { formList } from '@mantine/form';
import { HyperparametersCollection, HyperparameterTypes, IntegerHyperparameter } from '../../../../../lib/db_types';
import { useDebounce } from "use-debounce";
import { final } from 'pino';

function defaultNonDefaultCount(parameters: HyperparametersCollection) {
	let nonDefaultCount = 0;
	let defaultCount = 0;
	if (parameters.hyperparameters.length > 0) {
		//Calculate if non default values are above one
		for (const param of parameters.hyperparameters) {
			if(param.type === HyperparameterTypes.PARAM_GROUP) {
				for (const key in param.values) {
					const groupParamsLength = param.values[key].length;
					nonDefaultCount += groupParamsLength;
				}
			} else if (param.useDefault) {
				defaultCount++;
				continue;
			}
			nonDefaultCount++;
		}
	}
	return { nonDefaultCount, defaultCount };
}

function nonDefaultPermCalculation(parameters: HyperparametersCollection, finalPermutations: number) {
	parameters.hyperparameters.forEach(hyperparameter => {
		if (hyperparameter.type == HyperparameterTypes.INTEGER || hyperparameter.type == HyperparameterTypes.FLOAT) {
			const intFloatParam = hyperparameter as IntegerHyperparameter;
			const range = Math.floor((intFloatParam.max - intFloatParam.min) / intFloatParam.step) + 1;
			finalPermutations *= range;
		} else if (hyperparameter.type == HyperparameterTypes.STRING) {
			finalPermutations *= 1;
		} else if (hyperparameter.type == HyperparameterTypes.BOOLEAN) {
			console.log("Calculating permutations for boolean ", hyperparameter.name);
			finalPermutations *= 2;
		} else if (hyperparameter.type == HyperparameterTypes.STRING_LIST) {
			finalPermutations *= hyperparameter.values.length;
				} else if (hyperparameter.type == HyperparameterTypes.PARAM_GROUP) {
					console.log("Calculating permutations for param group ", hyperparameter.name, " with values ", hyperparameter.values);
					let groupPermutations = 1;
					for (const key in hyperparameter.values) {
						console.log("Calculating permutations for param group ", hyperparameter.name, " with key ", key, " and values ", hyperparameter.values[key]);
				 		groupPermutations *= hyperparameter.values[key].length;
						break;
					}
					finalPermutations *= groupPermutations;
			}
		});
	return finalPermutations;
}

function defaultPermCalculation(parameters: HyperparametersCollection, finalPermutations: number) {
	let numberTotal = 0;
	let rangeMultiplier = 1;
	parameters.hyperparameters.forEach(hyperparameter => {
		if (hyperparameter.type == HyperparameterTypes.INTEGER || hyperparameter.type == HyperparameterTypes.FLOAT) {
			if(hyperparameter.useDefault) {
				const intFloatParam = hyperparameter as IntegerHyperparameter;
				const range = Math.floor((intFloatParam.max - intFloatParam.min) / intFloatParam.step) + 1;
				numberTotal += 1;
				finalPermutations += range;
			} else {
				const intFloatParam = hyperparameter as IntegerHyperparameter;
				rangeMultiplier = Math.floor((intFloatParam.max - intFloatParam.min) / intFloatParam.step) + 1;
			}
		} else if (hyperparameter.type == HyperparameterTypes.STRING) {
			finalPermutations += 1;
		} else if (hyperparameter.type == HyperparameterTypes.BOOLEAN) {
			finalPermutations += 2;
		} else if (hyperparameter.type == HyperparameterTypes.STRING_LIST) {
			const stringListParam = hyperparameter as any;
			finalPermutations += stringListParam.values.length - 1;
		} else if (hyperparameter.type == HyperparameterTypes.PARAM_GROUP) {
			const paramGroupParam = hyperparameter as any; 
			let groupPermutations = 1;
			for (const key in paramGroupParam.values) {
				groupPermutations *= paramGroupParam.values[key].length;
			}
			finalPermutations += groupPermutations - 1;
		}
		});
	finalPermutations = finalPermutations - numberTotal  + 1;
	finalPermutations *= rangeMultiplier;
	return finalPermutations;
}

function calcPermutations(parameters: HyperparametersCollection) {
	let finalPermutations;
	const { nonDefaultCount, defaultCount } = defaultNonDefaultCount(parameters);

	// If there are 2 or more non default values, calculate permutations as normal with all parameters. 
	// If there are 0 or 1 non default values, calculate permutations with only non default values and then add the default values at the end.
	if (nonDefaultCount >= 2) {
		finalPermutations = nonDefaultPermCalculation(parameters, 1);
	} else if (nonDefaultCount <= 1 && defaultCount > 0) {
		finalPermutations = defaultPermCalculation(parameters, 1);
	}

	return finalPermutations;
}

export const ParameterOptions = ['integer', 'float', 'bool', 'stringlist', 'paramgroup'] as const;

export const ParamStep = ({ form, confirmedValues, setConfirmedValues, ...props }) => {

	const [text, setText] = useState('');
	const [permutations, setPermutations] = useState(0);
	const [debouncedFormValues] = useDebounce(form.values, 300);

	useEffect(() => {
		const permutations = calcPermutations(debouncedFormValues);
		setText(permutations !== undefined ? permutations.toString() : 'Permutations Unable to be Calculated');
		setPermutations(permutations ?? 0);
	}, [debouncedFormValues, confirmedValues]);

	return (
		<div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
			<Fragment>
				<InputSection header={'Parameters'}>
					<div className='sm:col-span-4 inline-flex'>
						<span className='rounded-l-md text-sm text-white font-bold bg-blue-600  items-center px-4 py-2 border border-transparent'>
							+
						</span>
						<span className='relative z-0 inline-flex flex-1 shadow-sm rounded-md'>
							{ParameterOptions.map((type) => (
								<button
									type='button'
									key={`addNew_${type}`}
									className='-ml-px relative items-center flex-1 px-6 py-2 last:rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:border-blue-500'
									onClick={() => {
										form.insertListItem('hyperparameters', {
											name: '',
											default: -1,
											...((type === 'paramgroup') && { params: {} }),
											...((type === 'stringlist') && { values: [''] }),
											...((type === 'integer' || type === 'float') && {
												min: '',
												max: '',
												step: '',
											}),
											type: type,
											useDefault: false,
										})
									}}
								>
									{type}
								</button>
							))}
						</span>
					</div>
				</InputSection>

				<div className={'flex-0 p-4 h-full grow-0'}>
					<div
						className="h-full grow-0 max-h-fit mb-4 overflow-y-scroll p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400"
						style={{ maxHeight: '60vh' }}
					>
						<div className="flex flex-col">
							{props.children}
						</div>
					</div>
				</div>
			</Fragment>
			<div className="text-right p-4">
				{(() => {
					if (permutations > 100000) {
						return (
							<span className='text-xl font-bold text-red-600'>
								WARNING: This is NOT Recommended. Expected Permutations: {text}
							</span>
						);
					} else if (permutations > 10000) {
						return (
							<span className='text-md font-bold text-orange-600'>
								Caution: This will take time. Expected Permutations: {text}
							</span>
						);
					} else if (permutations > 1000) {
						return (
							<span className='text-sm font-medium text-yellow-600'>
								Expected Permutations: {text}
							</span>
						);
					} else {
						return (
							<span className='text-sm font-bold'>
								Expected Permutations: {text}
							</span>
						);
					}
				})()}
			</div>
		</div>
	);
};


