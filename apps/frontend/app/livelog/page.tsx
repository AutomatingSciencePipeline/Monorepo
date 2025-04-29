import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Logo } from "../components/Logo";
import classNames from "classnames";
import { auth } from "../../auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getDocumentFromId } from "../../lib/mongodb_funcs";
import LogViewer from "../components/logViewer/logViewer";

const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: true }
];
const userNavigation = [
    { name: 'Your Profile', href: '#' },
    { name: 'Sign out', href: '#' },
];

interface LiveLogPageProps {
    searchParams: {
        id?: string;
    };
}

export default async function LiveLogPage({ searchParams }: LiveLogPageProps) {
    const session = await auth();
    const params = await searchParams;
    const id = params.id;
    if (!id) {
        redirect('/dashboard?toastMessage=' + encodeURIComponent("No experiment ID provided!") + "&toastType=error");
    }

    // Make sure id is a valid ObjectId
    if (id.length !== 24) {
        redirect('/dashboard?toastMessage=' + encodeURIComponent("Invalid experiment ID provided!") + "&toastType=error");
    }

    // Get the experiment
    const experiment = await getDocumentFromId(id);
    if (!experiment) {
        redirect('/dashboard?toastMessage=' + encodeURIComponent("Experiment not found!") + "&toastType=error");
    }
    if (experiment.creator !== session?.user?.id) {
        redirect('/dashboard?toastMessage=' + encodeURIComponent("You do not have permission to access this experiment!") + "&toastType=error");
    }


    return (
        <div className="flex flex-col h-screen">
            <Disclosure as='nav' className='flex-shrink-0 bg-blue-600'>
                <div className='mx-auto px-2 sm:px-4 lg:px-8'>
                    <div className='relative flex items-center justify-between h-16'>
                        {/* Logo section */}
                        <div className='flex items-center px-2 lg:px-0 w-full'>
                            <div className='flex-shrink-0'>
                                <Logo />
                            </div>
                            <div className="text-white p-4 m-4 font-bold text-xl w-full">
                                Live log for: {experiment.name}
                            </div>
                        </div>
                        {/* Links section */}
                        <div className='hidden lg:block lg:w-80'>
                            <div className='flex items-center justify-end'>
                                <div className='flex'>
                                    {navigation.map((item) => (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            target={item.name === 'Help' ? '_blank' : '_self'}
                                            className='px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:text-white'
                                            aria-current={item.current ? 'page' : undefined}
                                        >
                                            {item.name}
                                        </a>
                                    ))}
                                </div>
                                {/* Profile dropdown */}
                                <div>
                                    <div className='bg-blue-700 flex text-sm rounded-full text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white m-4'>
                                        {session?.user?.image ? (
                                            <Image
                                                className='h-8 w-8 rounded-full'
                                                src={session.user.image}
                                                alt='User Photo'
                                                width={32} // specify width
                                                height={32} // specify height
                                            />
                                        ) : (
                                            // Optionally, you could add a placeholder or leave this empty
                                            <></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DisclosurePanel className='lg:hidden'>
                    <div className='px-2 pt-2 pb-3 space-y-1'>
                        {navigation.map((item) => (
                            <DisclosureButton
                                key={item.name}
                                as='a'
                                href={item.href}
                                target={item.name === 'Help' ? '_blank' : '_self'}
                                className={classNames(
                                    item.current ?
                                        'text-white bg-blue-800' :
                                        'text-blue-200 hover:text-blue-100 hover:bg-blue-600',
                                    'block px-3 py-2 rounded-md text-base font-medium'
                                )}
                                aria-current={item.current ? 'page' : undefined}
                            >
                                {item.name}
                            </DisclosureButton>
                        ))}
                    </div>
                </DisclosurePanel>
            </Disclosure>
            <div className="flex flex-1 overflow-hidden m-4 border-2 border-slate-200 rounded-lg p-4">
                <LogViewer expId={id} />
            </div>
        </div >
    )
}

