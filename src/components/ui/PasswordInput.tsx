import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

type PasswordInputProps = {
	id: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	autoComplete?: string;
	lang?: "ar" | "en";
};

export function PasswordInput({
	id,
	name,
	value,
	onChange,
	onBlur,
	placeholder,
	autoComplete,
	lang = "ar"
}: PasswordInputProps) {
	const [visible, setVisible] = useState(false);
	const isAr = lang === "ar";

	return (
		<div className='relative'>
			<Input
				autoComplete={autoComplete}
				className='pe-11'
				id={id}
				name={name}
				onBlur={onBlur}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				type={visible ? "text" : "password"}
				value={value}
			/>
			<Button
				aria-label={
					visible
						? isAr
							? "إخفاء كلمة المرور"
							: "Hide password"
						: isAr
							? "إظهار كلمة المرور"
							: "Show password"
				}
				className='text-muted-foreground hover:text-foreground absolute end-0 top-0 h-full w-11 rounded-[var(--radius-lg)]'
				onClick={() => setVisible(prev => !prev)}
				size='icon'
				type='button'
				variant='ghost'
			>
				<MaterialIcon
					className='text-xl'
					name={visible ? "visibility_off" : "visibility"}
				/>
			</Button>
		</div>
	);
}
