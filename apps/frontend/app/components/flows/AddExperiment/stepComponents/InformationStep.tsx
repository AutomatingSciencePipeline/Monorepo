'use client'

import { Fragment, useEffect } from 'react';
import { InputSection } from '../../../InputSection';
import {Tag} from '../../../Tag';
import React, {useState} from 'react';
import toast from 'react-hot-toast';
import { Menu, MenuItems, MenuItem} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import classNames from 'classnames';
import BasicMenuItem from '../../../BasicMenuItem';
export const TAG_MAX_NUMBER = 5;

export const InformationStep = ({ form, validationErrors, setValidationErrors, ...props }) => {
    const [individualTag, setIndividualTag] = useState("");

    const addTagValue = () => {
        if(form.values.tags && (form.values.tags.includes(individualTag.trim()))){
            toast.error("Experiment tags cannot be redundant.", {duration: 1500});
            return;
        } else if(form.values.tags && form.values.tags.length >= TAG_MAX_NUMBER){
            toast.error(`Max number of experiment tags is ${TAG_MAX_NUMBER}.`, {duration: 1500});
            return;
        } else if(!individualTag || !individualTag.trim().length) {
            toast.error("Experiment tag cannot be blank.", {duration: 1500});
            return;
        } else {
            form.setFieldValue('tags', [...form.values.tags, individualTag]);
            setIndividualTag("");
        }
    }

    const deleteTag = (title) => {
        form.setFieldValue('tags', form.values.tags.filter(tagName => tagName !== title));
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
                                    value={individualTag}
                                    maxLength={40}
                                    placeholder='Press "Return" or click "Add tag" to confirm tag'
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault(); 
                                            addTagValue();
                                        }
                                    }}
                                    onChange={(e) => setIndividualTag(e.target.value)}
                                    className='block rounded-md w-full border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                            />
                            </div>
                            <div className=''>
                                <button className='w-full border border-dashed border-blue-500 rounded-md px-3 py-2 text-sm font-medium text-blue-500 hover:text-blue-700 hover:border-blue-700'
                                onClick={addTagValue}>
                                    + Add tag
                                </button>
                            </div>
                        </div>
                        <div className='w-full flex flex-wrap gap-1'>
                           {Array.isArray(form.values.tags) &&
                           form.values.tags.map((title) =>(
                                <Tag deletable={true} text={title} onDelete={() => deleteTag(title)}/>
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
                <InputSection header={'Config File Format'}>
                    <Menu as='div' className='relative'>
                        <Menu.Button className=' bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
                            {form.values.configFileFormat}
                            <ChevronDownIcon
                                className='ml-2.5 -mr-1.5 h-5 w-5 text-gray-400'
                                aria-hidden='true' />
                        </Menu.Button>
                        <MenuItems className='origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
                            <div className='py-1 text-center'>
                                <BasicMenuItem menuHoverActiveCss={menuHoverActiveCss} label="ini" onClick={() => form.setFieldValue('configFileFormat', 'ini')} />
                                <BasicMenuItem menuHoverActiveCss={menuHoverActiveCss} label="yaml" onClick={() => form.setFieldValue('configFileFormat', 'yaml')} />
                            </div>
                        </MenuItems>
                    </Menu>
                </InputSection>
            </Fragment>
        </div>
    );
};

const menuHoverActiveCss = (active: boolean) => {
        return classNames(
            active ?
                'bg-gray-100 text-gray-900' :
                'text-gray-700',
            'block px-4 py-2 text-sm'
        );
};