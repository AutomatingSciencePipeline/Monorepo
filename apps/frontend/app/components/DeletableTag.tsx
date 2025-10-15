import { XMarkIcon } from '@heroicons/react/24/solid';

export function DeletableTag({text}: {text: string}){
    return (
        <div className="cursor-pointer gap-1 flex rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 inset-ring inset-ring-blue-400/30"> 
            <span className="h-full hover:underline flex-1">{text}</span>
            <div>
                <XMarkIcon className="flex-none text-blue-400 cursor-pointer w-4 h-4 grid-cols-1" />
            </div>
        </div>
    );
};