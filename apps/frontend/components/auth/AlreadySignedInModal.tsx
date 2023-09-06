import Link from 'next/link';
import Router from 'next/router';
import { useAuth } from '../../firebase/fbAuth';

export interface AlreadySignedInModalProps {
	continueButtonMessage: string,
	linkTarget: string
}

export const AlreadySignedInModal = ({ continueButtonMessage, linkTarget }: AlreadySignedInModalProps) => {
	const { authService } = useAuth();

	return (
        <div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
            <div className='bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                <div className='px-4 py-8 sm:px-10'>
                    <div>
                        <p className='text-sm font-medium text-gray-700'>
                            {"You're already signed in as"}
                        </p>
                        <span className='px-2 bg-white text-gray-500'>
                            {authService.userEmail}
                        </span>
                    </div>

                    <div className='mt-3'>
                        <Link
                            href={linkTarget}
                            className='space-x-6 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>

                            {continueButtonMessage}

                        </Link>
                    </div>

                    <div className='mt-3 relative'>
                        <div
                            className='absolute inset-0 flex items-center'
                            aria-hidden='true'
                        >
                            <div className='w-full border-t border-gray-300' />
                        </div>
                        <div className='relative flex justify-center text-sm'>
                            <span className='px-2 bg-white text-gray-500'>
                                Or
                            </span>
                        </div>
                    </div>
                    <div className='mt-3'>
                        <a
                            className='space-x-6 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            onClick={() => {
                                return (
                                    authService
                                        .signOut()
                                        .then(() => {
                                            Router.reload();
                                        })
                                        .catch((err) => console.log('Sign out error', err))
                                );
                            }}
                        >
                            Log Out
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
