"use client";

import { Disclosure, Menu, Transition, Tab, TabGroup, TabList, TabPanel, TabPanels, MenuButton, MenuItems, MenuItem, DisclosureButton, DisclosurePanel, DialogPanel, TransitionChild, Dialog, DialogTitle } from "@headlessui/react";
import Image from 'next/image';
import { signOut, useSession } from "next-auth/react";
import { Fragment, useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import classNames from "classnames";
import { useRouter } from "next/navigation";
import { cancelExperimentById, getUsers, updateUserRole } from "../../lib/mongodb_funcs";
import toast, { Toaster } from "react-hot-toast";

declare module "next-auth" {
    interface User {
        role?: string;
    }
}

const GLADOS_DOCS_LINK = 'https://automatingsciencepipeline.github.io/Monorepo/tutorial/usage/'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: true },
    { name: 'Help', href: GLADOS_DOCS_LINK, current: false }
];
const userNavigation = [
    { name: 'Your Profile', href: '#' },
    { name: 'Sign out', href: '#' },
];

export default function Page() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [users, setUsers] = useState([] as any[]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState("");

    const [runningExperiments, setRunningExperiments] = useState([] as any[]);

    const handleUpdateRole = (str) => {
        setSelectedUser(str);
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (session) {
            if (session.user?.role === "admin") {
                getUsers().then((users) => {
                    setUsers(users);
                });
            }
        }
    }, [session, isModalOpen]);

    useEffect(() => {
        if (!session) {
            return;
        }

        if(session.user?.role !== "admin") {
            return;
        }

        const eventSource = new EventSource(`/api/experiments/adminListen`);

        eventSource.onmessage = (event) => {
            if (event.data !== 'heartbeat') {
                try {
                    setRunningExperiments(JSON.parse(event.data) as any[]);
                }
                catch {
                    console.log(`${event.data} was not valid JSON!`);
                }
            }
        }
        return () => eventSource.close();
    }, [session]);

    // Show loading while session is loading
    if (status === "loading") return <p>Loading...</p>;

    // Show not authorized message if user is not logged in or doesn't have the admin role
    if (!session || session.user?.role !== "admin") {
        // Redirect to the dashboard
        router.push('/dashboard');
        return <p>You are not authorized to view this page!</p>;
    }

    // If the user is authorized
    return <div>
        <Toaster />
        <Disclosure as='nav' className='flex-shrink-0 bg-blue-600'>
            {({ open }) => (
                <>
                    <div className='mx-auto px-2 sm:px-4 lg:px-8'>
                        <div className='relative flex items-center justify-between h-16'>
                            {/* Logo section */}
                            <div className='flex items-center px-2 lg:px-0 xl:w-64'>
                                <div className='flex-shrink-0'>
                                    <Logo />
                                </div>
                                <div className="text-white p-4 m-4 font-bold text-xl">
                                    Administrator Dashboard
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
                                    <Menu as='div' className='ml-4 relative flex-shrink-0'>
                                        <div>
                                            <MenuButton className='bg-blue-700 flex text-sm rounded-full text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white'>
                                                <span className='sr-only'>Open user menu</span>
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
                                            </MenuButton>
                                        </div>
                                        <Transition
                                            as={Fragment}
                                            enter='transition ease-out duration-100'
                                            enterFrom='transform opacity-0 scale-95'
                                            enterTo='transform opacity-100 scale-100'
                                            leave='transition ease-in duration-75'
                                            leaveFrom='transform opacity-100 scale-100'
                                            leaveTo='transform opacity-0 scale-95'
                                        >
                                            <MenuItems className='origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none'>
                                                {userNavigation.map((item) => (
                                                    <MenuItem key={item.name}>
                                                        {({ active }) => (
                                                            <a
                                                                href={item.href}
                                                                onClick={() => {
                                                                    return (
                                                                        item.name === 'Sign out' &&
                                                                        signOut()
                                                                    );
                                                                }}
                                                                className={classNames(
                                                                    active ? 'bg-gray-100' : '',
                                                                    'block px-4 py-2 text-sm text-gray-700'
                                                                )}
                                                            >
                                                                {item.name}
                                                            </a>
                                                        )}
                                                    </MenuItem>
                                                ))}
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
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
                        <div className='pt-4 pb-3 border-t border-blue-800'>
                            <div className='px-2 space-y-1'>
                                {userNavigation.map((item) => (
                                    <DisclosureButton
                                        key={item.name}
                                        as='a'
                                        onClick={() => {
                                            return signOut();
                                        }}
                                        href={item.href}
                                        className='block px-3 py-2 rounded-md text-base font-medium text-blue-200 hover:text-blue-100 hover:bg-blue-600'
                                    >
                                        {item.name}
                                    </DisclosureButton>
                                ))}
                            </div>
                        </div>
                    </DisclosurePanel>
                </>
            )}
        </Disclosure>
        <Transition appear show={isModalOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                    Update Role
                                </DialogTitle>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        Please select the new role for the user
                                    </p>
                                </div>

                                <div className="mt-4 justify-center flex">
                                    <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg shadow-md m-2"
                                        onClick={() => {
                                            toast.promise(updateUserRole(selectedUser, "admin"), {
                                                loading: 'Updating role...',
                                                success: 'Role updated successfully!',
                                                error: 'Failed to update role!'
                                            });
                                            setIsModalOpen(false);
                                        }}>
                                        Admin
                                    </button>
                                    <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow-md m-2"
                                        onClick={() => {
                                            toast.promise(updateUserRole(selectedUser, "privileged"), {
                                                loading: 'Updating role...',
                                                success: 'Role updated successfully!',
                                                error: 'Failed to update role!'
                                            });
                                            setIsModalOpen(false);
                                        }}>
                                        Privileged
                                    </button>
                                    <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow-md m-2"
                                        onClick={() => {
                                            toast.promise(updateUserRole(selectedUser, "user"), {
                                                loading: 'Updating role...',
                                                success: 'Role updated successfully!',
                                                error: 'Failed to update role!'
                                            });
                                            setIsModalOpen(false);
                                        }}>
                                        User
                                    </button>
                                </div>

                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
        {/* Create a place to view running experiments */}
        <TabGroup className="p-4 w-auto h-auto mx-auto">
            <TabList className="p-4 w-auto h-auto mx-auto">
                <Tab
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 mx-2 rounded-lg shadow-md data-[selected]:bg-blue-900">
                    User Management
                </Tab>
                <Tab
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 mx-2 rounded-lg shadow-md data-[selected]:bg-blue-900">
                    Running Experiment Management
                </Tab>
                <Tab
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 mx-2 rounded-lg shadow-md data-[selected]:bg-blue-900">
                    Default Experiments Tester
                </Tab>
            </TabList>
            <TabPanels className={"p-4 w-auto h-auto mx-auto"}>
                <TabPanel className={"flex"}>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3 hidden">
                                        Id
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Email
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Role
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Manage
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user._id} // Add the key prop here
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                    >
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {user.email}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {user.role}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {
                                                session.user?.id === user._id ?
                                                    <></> :
                                                    <button
                                                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg shadow-md"
                                                        onClick={() => handleUpdateRole(user._id)}
                                                    >
                                                        Change Role
                                                    </button>
                                            }
                                        </th>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabPanel>
                <TabPanel className={"flex"}>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        Experiment Name
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        User
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Progress
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Start Time
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Manage
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {runningExperiments.map((experiment) => (
                                    <tr
                                        key={experiment._id} // Add the key prop here
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                    >
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {experiment.name}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {experiment.creatorEmail}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {experiment.passes + experiment.fails} / {experiment.totalExperimentRuns}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {new Date(experiment.startedAtEpochMillis).toLocaleString()}
                                        </th>
                                        <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            <button
                                                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-md"
                                                onClick={() => {
                                                    toast.promise(cancelExperimentById(experiment.id), {
                                                        loading: 'Cancelling experiment...',
                                                        success: 'Experiment cancelled successfully!',
                                                        error: 'Failed to cancel experiment!'
                                                    });
                                                }}>
                                                Stop
                                            </button>
                                        </th>
                                    </tr>))
                                }
                            </tbody>
                        </table>
                    </div>
                </TabPanel>
                <TabPanel>
                    Work in progress!!!
                </TabPanel>
            </TabPanels>
        </TabGroup>
    </div>
}