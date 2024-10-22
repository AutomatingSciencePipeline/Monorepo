'use client'

import { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import { Popover } from '@headlessui/react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import { Logo } from './components/Logo';
import { SignUpModal } from './components/auth/SignUpModal';
import { AlreadySignedInModal } from './components/auth/AlreadySignedInModal';
import { useState } from 'react';
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react"

export const metadata: Metadata = {
  title: 'Glados',
};

const HomePage = () => {
  const router = useRouter();
  // const { userId } = useAuth();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  console.log('userId', session?.user?.id);
  console.log(loading, session?.user?.id);

  return (
    <div className={'w-full h-full'}>
      <main className={`${styles.main} h-full`}>
        <div className='h-full w-full relative bg-gray-800 overflow-hidden'>
          <div
            className='hidden sm:block sm:absolute sm:inset-0 h-full'
            aria-hidden='true'
          >
            <svg
              className='absolute bottom-0 right-0 transform translate-x-1/2 mb-48 text-gray-700 lg:top-0 lg:mt-28 lg:mb-0 xl:transform-none xl:translate-x-0'
              width={364}
              height={384}
              viewBox='0 0 364 384'
              fill='none'
            >
              <rect
                width={364}
                height={384}
                fill='url(#eab71dd9-9d7a-47bd-8044-256344ee00d0)'
              />
            </svg>
          </div>
          <div className='h-full flex flex-col justify-around relative pt-6 pb-16 sm:pb-24'>
            <Popover>
              <nav
                className='relative max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6'
                aria-label='Global'
              >
                <div className='flex items-center flex-1'>
                  <div className='flex items-center justify-between w-full md:w-auto'>
                    <a href='#'>
                      <span className='sr-only'>Workflow</span>
                      <Logo />
                    </a>
                    <div className='-mr-2 flex items-center md:hidden'>
                      <Popover.Button className='bg-gray-800 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus-ring-inset focus:ring-white'>
                        <span className='sr-only'>Open main menu</span>
                        <Bars3Icon className='h-6 w-6' aria-hidden='true' />
                      </Popover.Button>
                    </div>
                  </div>
                </div>
                <div className='hidden md:flex'>
                  <button className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700' onClick={() => signIn("github")}>Sign In</button>
                  {/* <Link
                    href={'/signin'}
                    className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700'>
                    Log in
                  </Link> */}
                </div>
              </nav>
            </Popover>

            <main className='h-full flex flex-col justify-around mt-16 sm:mt-24'>
              <div className='mx-auto max-w-7xl'>
                <div className='lg:grid lg:grid-cols-12 lg:gap-8'>
                  <div className='px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left lg:flex lg:items-center'>
                    <div>
                      <a
                        href='https://github.com/AutomatingSciencePipeline/Monorepo'
                        className='inline-flex items-center text-white bg-gray-900 rounded-full p-1 pr-2 sm:text-base lg:text-sm xl:text-base hover:text-gray-200'
                      >
                        <span className='px-3 py-0.5 text-white text-xs font-semibold leading-5 uppercase tracking-wide bg-blue-500 rounded-full'>
                          {"We're launching!"}
                        </span>
                        <span className='ml-4 text-sm'>
                          Visit our repository
                        </span>
                        <ChevronRightIcon
                          className='ml-2 w-5 h-5 text-gray-500'
                          aria-hidden='true'
                        />
                      </a>
                      <h1 className='mt-4 text-4xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-5xl xl:text-6xl'>
                        <span className='md:block'>Automate science</span>{' '}
                        <span className='text-blue-400 md:block'>
                          with Glados
                        </span>
                      </h1>
                      <p className='mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl'>
                        A senior capstone project built for Rose-Hulman
                        Institute of Technology, Glados aims to become the
                        premier platform for researchers to share computational
                        resources in performing compute-intensive research
                        experiments. Join now!
                      </p>
                      <p className='mt-8 text-sm text-white uppercase tracking-wide font-semibold sm:mt-10'>
                        Used by
                      </p>
                      <div className='mt-5 w-full sm:mx-auto sm:max-w-lg lg:ml-0'>
                        {/* <div className='flex flex-wrap items-start justify-between'>
                          TODO: include rose logo and other stuff
                        </div> */}
                      </div>
                    </div>
                  </div>
                  {session && !loading ?
                    <AlreadySignedInModal
                      continueButtonMessage={'Continue to the Dashboard'}
                      linkTarget={'/dashboard'}
                    /> :
                    <SignUpModal afterSignUp={() => {
                      setLoading(true);
                      console.log("pushing to dash");
                      router.push('/dashboard');
                    }} />
                  }
                </div>
              </div>
            </main>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;