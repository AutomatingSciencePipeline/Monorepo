import { MenuItem} from '@headlessui/react';

const BasicMenuItem = ({menuHoverActiveCss, label, onClick}) => {
    return <MenuItem>
        {({ active }) => (
            <a
                href="#"
                className={menuHoverActiveCss(active)}
                onClick={onClick}
            >
                {label}
            </a>
        )}
    </MenuItem>;
}

export default BasicMenuItem;