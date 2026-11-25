// apps/web/src/routes/settings.lazy.tsx

import {createLazyFileRoute} from "@tanstack/react-router";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {MaterialIcon} from "@/components/ui/MaterialIcon";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useActiveClinic} from "@/hooks/use-active-clinic";
import {useAiConfig, useCredit} from "@/hooks/use-ai-config";
import type {Provider} from '#/server/functions/settings.functions.ts';

export const Route = createLazyFileRoute("/_app/settings")({
	component: SettingsComponent
});

function SettingsComponent() {
	const { user, clinicId } = useActiveClinic();
	const { config: aiConfig, update: updateAi, isSaving } = useAiConfig();
	const { credit } = useCredit();

	// AI Config Form State
	const [provider, setProvider] = useState("google");
	const [model, setModel] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState("");

	useEffect(() => {
		if (aiConfig) {
			setProvider(aiConfig.provider || "google");
			setModel(aiConfig.model || "");
			setBaseUrl(aiConfig.baseUrl || "");
		}
	}, [aiConfig]);

	const handleSaveAi = async (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		await updateAi({
			provider : provider as Provider,
			model: model.trim() || undefined,
			apiKey: apiKey.trim() || undefined,
			baseUrl: baseUrl.trim() || undefined
		});
		setApiKey("");
	};

	return (
		<div className='mx-auto min-h-screen max-w-5xl px-4 py-6 md:px-8'>
			{/* Header */}
			<div className='mb-6'>
				<div className='flex items-center gap-2'>
					<MaterialIcon
						className='text-2xl text-[var(--clay-black)]'
						name='settings'
					/>
					<h1 className='font-headline text-2xl font-bold text-[var(--clay-black)]'>
						Clinic &amp; System Settings
					</h1>
				</div>
				<p className='mt-1 text-sm text-[var(--warm-charcoal)]/80'>
					Manage clinical AI engine configuration, user profile, and clinic
					parameters (إعدادات النظام والعيادة)
				</p>
			</div>

			<Tabs
				className='space-y-6'
				defaultValue='ai'
			>
				<TabsList className='border-b border-[var(--oat-border)] bg-transparent p-0'>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='ai'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='psychology'
						/>
						<span>Clinical AI Model</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='clinic'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='local_hospital'
						/>
						<span>Clinic Profile</span>
					</TabsTrigger>
					<TabsTrigger
						className='data-[state=active]:border-b-2 data-[state=active]:border-[var(--matcha-600)] data-[state=active]:text-[var(--matcha-800)]'
						value='account'
					>
						<MaterialIcon
							className='mr-1.5 text-base'
							name='person'
						/>
						<span>User Account</span>
					</TabsTrigger>
				</TabsList>

				{/* Tab 1: AI Model Configuration */}
				<TabsContent
					className='space-y-6'
					value='ai'
				>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Clinical AI Intelligence Engine
							</CardTitle>
							<CardDescription>
								Configure the LLM engine for pediatric SOAP drafting, parent
								instructions, and dosing safety checks
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								className='space-y-4'
								onSubmit={handleSaveAi}
							>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
									<div>
										<Label htmlFor='providerSelect'>AI Provider</Label>
										<Select
											onValueChange={v => v && setProvider(v)}
											value={provider}
										>
											<SelectTrigger id='providerSelect'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='google'>
													Google Gemini (Recommended for Medical)
												</SelectItem>
												<SelectItem value='anthropic'>
													Anthropic Claude
												</SelectItem>
												<SelectItem value='openai'>OpenAI (GPT-4o)</SelectItem>
												<SelectItem value='openrouter'>OpenRouter</SelectItem>
												<SelectItem value='custom'>
													Local / Custom Endpoint
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor='modelInput'>Model Identifier</Label>
										<Input
											id='modelInput'
											onChange={e => setModel(e.target.value)}
											placeholder='e.g. gemini-2.5-flash or claude-3-7-sonnet'
											value={model}
										/>
									</div>
								</div>

								<div>
									<Label htmlFor='keyInput'>
										API Key (Leaves server masked)
									</Label>
									<Input
										id='keyInput'
										onChange={e => setApiKey(e.target.value)}
										placeholder='Enter new key to update, or leave blank to keep current'
										type='password'
										value={apiKey}
									/>
									{aiConfig?.hasApiKey && (
										<p className='mt-1 text-xs font-medium text-emerald-700'>
											✓ Secure API Key is configured and encrypted on the
											server.
										</p>
									)}
								</div>

								<div>
									<Label htmlFor='baseUri'>Custom Base URL (Optional)</Label>
									<Input
										id='baseUri'
										onChange={e => setBaseUrl(e.target.value)}
										placeholder='https://api.openai.com/v1 (leave blank for default)'
										value={baseUrl}
									/>
								</div>

								<div className='pt-2'>
									<Button
										className='bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]'
										disabled={isSaving}
										type='submit'
									>
										{isSaving ? "Saving..." : "Save AI Configuration"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					{/* Quota Card */}
					{credit && (
						<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-sm font-bold text-[var(--clay-black)]'>
									Clinic AI Token Quota
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='flex items-baseline gap-4'>
									<div>
										<span className='text-xs text-[var(--warm-charcoal)]'>
											Token Balance:
										</span>
										<p className='text-lg font-bold text-[var(--clay-black)]'>
											{credit.balance.toLocaleString()}
										</p>
									</div>
									<div>
										<span className='text-xs text-[var(--warm-charcoal)]'>
											Lifetime Tokens Used:
										</span>
										<p className='text-lg font-bold text-[var(--clay-black)]'>
											{credit.lifetimeTokensUsed.toLocaleString()}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* Tab 2: Clinic Profile */}
				<TabsContent
					className='space-y-4'
					value='clinic'
				>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Clinic Branch Information
							</CardTitle>
							<CardDescription>
								Facility identification and jurisdiction details
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3'>
							<div>
								<span className='text-xs text-[var(--warm-charcoal)]/80'>
									Clinic Identifier:
								</span>
								<p className='font-mono text-sm font-bold text-[var(--clay-black)]'>
									{clinicId}
								</p>
							</div>
							<div>
								<span className='text-xs text-[var(--warm-charcoal)]/80'>
									Clinical Standards:
								</span>
								<p className='text-sm text-[var(--clay-black)]'>
									Egyptian MOH Mandatory Schedule + WHO Multicentre Growth
									Reference
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tab 3: User Account */}
				<TabsContent
					className='space-y-4'
					value='account'
				>
					<Card className='border-[var(--oat-border)] bg-[var(--pure-white)]'>
						<CardHeader>
							<CardTitle className='text-base font-bold text-[var(--clay-black)]'>
								Clinician Profile
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-2 text-sm'>
							<p>
								<strong>Name:</strong> {user?.name || "Clinician"}
							</p>
							<p>
								<strong>Role:</strong> {user?.role?.toUpperCase() || "STAFF"}
							</p>
							<p>
								<strong>User ID:</strong> {user?.id}
							</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
