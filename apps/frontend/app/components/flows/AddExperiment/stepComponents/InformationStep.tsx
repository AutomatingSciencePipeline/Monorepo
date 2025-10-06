'use client'

import { Fragment, useEffect } from 'react';
import { InputSection } from '../../../InputSection';
import {Tag} from '../../../Tag';
import React, {useState} from 'react';

export const InformationStep = ({ form, validationErrors, setValidationErrors, ...props }) => {

    const [individualTag, setIndividualTag] = useState("")

    const TAG_MAX_NUMBER = 5;

    function addTagValue(){
        if(!form.values.tags.includes(individualTag) && form.values.tags.length <= TAG_MAX_NUMBER){ 
            form.setFieldValue('tags', [...form.values.tags, individualTag])
        }
    }
    
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

                <InputSection header={'Experiment Tags'}>
                    <div className='grid-rows-2 gap-2 col-span-4 space-y-5'>
                        <div className='grid grid-cols-6 gap-4'>
                            <div className='col-span-5'>
                                <input
                                type='text'
                                placeholder='Enter tag name and select "Add" to submit'
                                onChange={(e) => setIndividualTag(e.target.value)}
                                className='block rounded-md w-full border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                            />
                            </div>
                            <div className=''>
                                <button className='rounded-md w-full border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                onClick={addTagValue}>
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className='w-full flex space-x-2'>
                           {form.values.tags &&
                           form.values.tags.map((title) =>(
                                <Tag key={title} text={title} />
                            ))}
                        </div>
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
                <InputSection header={'Trial Timeout (hours)'}>
                    <div className='sm:col-span-4'>
                        <input
                            type='number'
                            placeholder='Maximum length for an trial to run in hours'
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
                <InputSection header={'Send Email Upon Completion'}>
                    <div className='sm:col-span-4'>
                        <input
                            type='checkbox'
                            checked={form.values.sendEmail}
                            onChange={() => form.setFieldValue('sendEmail', !form.values.sendEmail)}>
                        </input>
                    </div>
                </InputSection>
            </Fragment>
        </div>
    );
};