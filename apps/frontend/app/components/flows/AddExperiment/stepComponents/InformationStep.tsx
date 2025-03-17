'use client'

import { Fragment, useEffect } from 'react';
import { InputSection } from '../../../InputSection';

export const InformationStep = ({ form, validationErrors, setValidationErrors, ...props }) => {
    
    useEffect(() => {
        const errors = {
            name: !form.values.name,
            trialResult: !form.values.trialResult,
        };
        setValidationErrors(errors);
    }, [form.values, setValidationErrors]);

    return (
        <div className='h-full flex flex-col space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0'>
            <Fragment>
                <InputSection header={validationErrors.name ? (<span> Name <span className='text-sm text-red-500'>*</span></span>) : ('Name')}>
                    <div className='sm:col-span-4'>
                        <input
                            type='text'
							placeholder='Name of the experiment'
                            {...form.getInputProps('name')}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${validationErrors.name ? 'border-red-500' : ''}`}
                        />
                    </div>
                </InputSection>

                <InputSection header={'Description'}>
                    <div className='sm:col-span-4'>
                        <textarea
                            {...form.getInputProps('description')}
                            rows={3}
                            className='block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        />
                    </div>
                </InputSection>

                <InputSection header={validationErrors.trialResult ? (<span> Trial Result <span className='text-sm text-red-500'>*</span></span>) : ('Trial Result')}>
					<div className='sm:col-span-4'>
						<input
                            type='text'
                            placeholder='Name and extension of the experiment results file'
                            {...form.getInputProps('trialResult')}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${validationErrors.trialResult ? 'border-red-500' : ''}`}
                        />
                    </div>
                </InputSection>
                <InputSection header={'Trial Result Line Number'}>
                    <div className='sm:col-span-4'>
                        <input
                            type='number'
                            placeholder='Line number of the result that will be used for the trial (Leave blank for first line or -1 for last line)'
                            {...form.getInputProps('trialResultLineNumber')}
                            className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        />
                    </div>
                </InputSection>
                <InputSection header={"Trial's Extra File"}>
                    <div className='sm:col-span-4'>
                        <input
                            type='text'
                            placeholder='Name and extension of the output CSV file'
                            {...form.getInputProps('trialExtraFile')}
                            className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        />
                    </div>
                </InputSection>
                <InputSection header={'Trial Timeout (seconds)'}>
                    <div className='sm:col-span-4'>
                        <input
                            type='number'
                            placeholder='Maximum length for an trial to run in seconds'
                            {...form.getInputProps('timeout')}
                            className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        />
                    </div>
                </InputSection>
                <InputSection header={"Executable File (leave empty if not using zip)"}>
                    <div className='sm:col-span-4'>
                        <input
                            type='text'
                            placeholder='Name and extension of the executable file, relative to the root of the zip file'
                            {...form.getInputProps('experimentExecutable')}
                            className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        />
                    </div>
                </InputSection>
                <InputSection header={'Keep Logs'}>
                    <div className='sm:col-span-4'>
                        <input
                            type='checkbox'
                            checked={form.values.keepLogs}
                            onChange={() => form.setFieldValue('keepLogs', !form.values.keepLogs)}>
                        </input>
                    </div>
                </InputSection>
            </Fragment>
        </div>
    );
};