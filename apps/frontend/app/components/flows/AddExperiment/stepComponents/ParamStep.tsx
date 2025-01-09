'use client'

import { Fragment, useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { InputSection } from '../../../InputSection';
//import { formList } from '@mantine/form';
import { HyperparametersCollection, HyperparameterTypes, IntegerHyperparameter } from '../../../../../lib/db_types';
import { useDebounce } from "use-debounce";

function calcPermutations(parameters: HyperparametersCollection) {
	var noDefaultCount = 1;
	var defaultCount = 0;

	var countDefaults = 0;
	var totalObjs = 0;

	var allInts = true;
	console.log(parameters.hyperparameters);
	if (parameters.hyperparameters.length > 0) {

		parameters.hyperparameters.forEach(hyperparameter => {
			totalObjs++;
			if (hyperparameter.type == HyperparameterTypes.INTEGER || hyperparameter.type == HyperparameterTypes.FLOAT) {

				//if hyperparameter.step is not a number, set it to 1
				if (isNaN(hyperparameter.step) || hyperparameter.step == 0) {
					hyperparameter.step = 1;
					return -1;
				}

				if (hyperparameter.type == HyperparameterTypes.FLOAT)
					allInts = false;

				console.log("hyperparemeter: ", hyperparameter);

				let hyper = hyperparameter;
				let numObjs = 0;

				console.log(hyper);
				console.log(hyper.min);
				console.log(hyper.max);
				console.log(hyper.step);

				for (let i = hyper.min * 100; i <= hyper.max * 100; i += hyper.step * 100) {
					numObjs++;
				}

				console.log(numObjs);

				if (hyper.default == -1) {
					noDefaultCount = noDefaultCount * numObjs;
				} else {
					defaultCount = defaultCount + numObjs;
					countDefaults++;
				}

			}
			else if (hyperparameter.type == HyperparameterTypes.BOOLEAN) {
				if (hyperparameter.default != true && hyperparameter.default != false) {
					noDefaultCount = noDefaultCount * 2;
				}
				else {
					defaultCount = defaultCount + 2;
					countDefaults++;
				}
			}
			else if (hyperparameter.type == HyperparameterTypes.STRING_LIST) {
				if (hyperparameter.default == '-1') {
					noDefaultCount = noDefaultCount * hyperparameter.values.length;
				}
				else {
					defaultCount = defaultCount + hyperparameter.values.length;
					countDefaults++;
				}
			}
		});

		console.log(noDefaultCount);
		console.log(defaultCount);

		if (totalObjs < 3 && allInts && countDefaults > 0) {
			const total = (noDefaultCount + defaultCount) - 1;
			console.log(total);
			return total;
		}
		else {
			const total = (noDefaultCount * defaultCount) - (noDefaultCount * (countDefaults - 1));
			console.log(total);
			return total;
		}
	}

}

export const ParameterOptions = ['integer', 'float', 'bool', 'string', 'stringlist'] as const;

export const ParamStep = ({ form, confirmedValues, setConfirmedValues, ...props }) => {

	const [text, setText] = useState('');
	const [permutations, setPermutations] = useState(0);
	const [debouncedFormValues] = useDebounce(form.values, 300);

    useEffect(() => {
        console.log("confirmedValues: ", confirmedValues);
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
										console.log("add new item" + type + " to hyperparameters")
										form.insertListItem('hyperparameters', {
											name: '',
											default: -1,
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
					<DragDropContext>
						<div
							className='h-full grow-0 max-h-fit mb-4 overflow-y-scroll p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400'
							style={{ maxHeight: '60vh' }}

						>
							<Droppable
								as='div'
								droppableId='dnd-list'
								direction='vertical'
							>
								{(provided) => (
									<div {...provided.droppableProps} ref={provided.innerRef}>
										{props.children}
										{provided.placeholder}
									</div>
								)}
							</Droppable>
						</div>
					</DragDropContext>
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


