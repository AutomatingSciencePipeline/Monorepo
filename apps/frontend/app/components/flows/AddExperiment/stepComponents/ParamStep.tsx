'use client'

import { Fragment, useCallback, useEffect, useState } from 'react';
import { InputSection } from '../../../InputSection';
//import { formList } from '@mantine/form';
import { HyperparametersCollection, HyperparameterTypes, IntegerHyperparameter } from '../../../../../lib/db_types';
import { useDebounce } from "use-debounce";
import { final } from 'pino';

/** 
 * Helper to get the number of possible values for a single hyperparameter 
 */
function getParamRange(param: any): number {
    switch (param.type) {
        case HyperparameterTypes.INTEGER:
        case HyperparameterTypes.FLOAT:
            return Math.floor((param.max - param.min) / param.step) + 1;
        case HyperparameterTypes.BOOLEAN:
            return 2;
        case HyperparameterTypes.STRING:
            return 1;
        case HyperparameterTypes.STRING_LIST:
            return param.values.length;
        case HyperparameterTypes.PARAM_GROUP:
            // Calculate product of all groups
            return Object.values(param.values as any[][]).reduce((acc, list) => acc * list.length, 1);
        default:
            return 1;
    }
}

function calcPermutations(parameters: HyperparametersCollection) {
    const params = parameters.hyperparameters;
    if ((params.length as number) === 0) return 0;

    // 1. Calculate counts and metadata in one pass
    let nonDefaultCount = 0;
    let defaultCount = 0;
    
    params.forEach(p => {
        if (p.type === HyperparameterTypes.PARAM_GROUP) {
            nonDefaultCount += Object.keys(p.values).length;
        } else if (p.useDefault) {
            defaultCount++;
        } else {
            nonDefaultCount++;
        }
    });

    // 2. Logic Branching
    // Scenario A: 2+ non-defaults -> Standard Cartesian Product (Multiply everything)
    if (nonDefaultCount >= 2) {
        return params.reduce((total, p) => total * getParamRange(p), 1);
    }

    // Default parameters logic
    if (defaultCount > 0) {
        let sumOfRanges = 0;
        let rangeMultiplier = 1;
        let defaultTypeCount = 0;

        params.forEach(p => {
            const range = getParamRange(p);
            const isNumeric = p.type === HyperparameterTypes.INTEGER || p.type === HyperparameterTypes.FLOAT;

            if (isNumeric && !p.useDefault) {
                rangeMultiplier = range; // Special case for if a numeris param is non-default
            } else {
                if (isNumeric && p.useDefault) defaultTypeCount++;
                // sum (range - 1) for groups/lists, or just range for others
                const adjustment = (p.type === HyperparameterTypes.STRING_LIST || p.type === HyperparameterTypes.PARAM_GROUP) ? -1 : 0;
                sumOfRanges += (range + adjustment);
            }
        });

        return (sumOfRanges - defaultTypeCount + 1) * rangeMultiplier;
    }

    return 0;
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


