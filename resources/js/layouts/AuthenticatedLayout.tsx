// resources/js/Layouts/AuthenticatedLayout.tsx
import { ReactNode } from 'react';

type Props = {
    user: any;
    header?: ReactNode;
    children: ReactNode;
};

export default function AuthenticatedLayout({ user, header, children }: Props) {
    return (
        <div>
            <header>{header}</header>
            <main>{children}</main>
        </div>
    );
}
