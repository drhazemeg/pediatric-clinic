// apps/web/src/routes/settings.lazy.tsx

import type { Provider } from '#/server/functions/settings.functions.ts';

import { createLazyFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveClinic } from '@/hooks/use-active-clinic';
import { useAiConfig, useCredit } from '@/hooks/use-ai-config';

const isProvider = (value: string): value is Provider =>
  value === 'google' ||
  value === 'anthropic' ||
  value === 'openai' ||
  value === 'openrouter' ||
  value === 'custom';

const AiSettingsTab = () => {
  const { config: aiConfig, update: updateAi, isSaving } = useAiConfig();
  const { credit } = useCredit();

  const [provider, setProvider] = useState<Provider>('google');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [syncedConfig, setSyncedConfig] = useState(aiConfig);

  if (aiConfig !== syncedConfig) {
    setSyncedConfig(aiConfig);

    if (aiConfig !== undefined) {
      if (isProvider(aiConfig.provider)) {
        setProvider(aiConfig.provider);
      }

      setModel(aiConfig.model);
      setBaseUrl(aiConfig.baseUrl);
    }
  }

  const handleSaveAi = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedModel = model.trim();
    const trimmedKey = apiKey.trim();
    const trimmedBaseUrl = baseUrl.trim();

    await updateAi({
      provider,
      model: trimmedModel === '' ? undefined : trimmedModel,
      apiKey: trimmedKey === '' ? undefined : trimmedKey,
      baseUrl: trimmedBaseUrl === '' ? undefined : trimmedBaseUrl,
    });
    setApiKey('');
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-border bg-card">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-base font-bold text-foreground">
                Clinical AI Intelligence Engine
              </span>
            </CardTitle>
            <CardDescription>
              Configure the LLM engine for pediatric SOAP drafting, parent
              instructions, and dosing safety checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                handleSaveAi(e).catch(() => null);
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="providerSelect">AI Provider</Label>
                  <Select
                    onValueChange={(v) => {
                      if (isProvider(v)) {
                        setProvider(v);
                      }
                    }}
                    value={provider}
                  >
                    <SelectTrigger id="providerSelect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">
                        Google Gemini (Recommended for Medical)
                      </SelectItem>
                      <SelectItem value="anthropic">
                        Anthropic Claude
                      </SelectItem>
                      <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">
                        Local / Custom Endpoint
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="modelInput">Model Identifier</Label>
                  <Input
                    id="modelInput"
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gemini-2.5-flash or claude-3-7-sonnet"
                    value={model}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="keyInput">API Key (Leaves server masked)</Label>
                <Input
                  id="keyInput"
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter new key to update, or leave blank to keep current"
                  type="password"
                  value={apiKey}
                />
                {aiConfig?.hasApiKey === true && (
                  <p className="mt-1 text-xs font-medium text-chart-2">
                    ✓ Secure API Key is configured and encrypted on the server.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="baseUri">Custom Base URL (Optional)</Label>
                <Input
                  id="baseUri"
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1 (leave blank for default)"
                  value={baseUrl}
                />
              </div>

              <div className="pt-2">
                <Button disabled={isSaving} type="submit">
                  {isSaving ? 'Saving...' : 'Save AI Configuration'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Quota Card */}
      {credit !== undefined && (
        <div className="rounded-xl border border-border bg-card">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-sm font-bold text-foreground">
                  Clinic AI Token Quota
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">
                    Token Balance:
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {credit.balance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Lifetime Tokens Used:
                  </span>
                  <p className="text-lg font-bold text-foreground">
                    {credit.lifetimeTokensUsed.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const SettingsComponent = () => {
  const { user, clinicId } = useActiveClinic();

  const clinicianName =
    user?.name !== undefined && user.name !== '' ? user.name : 'Clinician';

  const clinicianRole =
    user?.role !== undefined && user.role !== ''
      ? user.role.toUpperCase()
      : 'STAFF';

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex text-2xl text-foreground">
            <MaterialIcon name="settings" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Clinic &amp; System Settings
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage clinical AI engine configuration, user profile, and clinic
          parameters (إعدادات النظام والعيادة)
        </p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="psychology" />
            </span>
            <span>Clinical AI Model</span>
          </TabsTrigger>
          <TabsTrigger value="clinic">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="local_hospital" />
            </span>
            <span>Clinic Profile</span>
          </TabsTrigger>
          <TabsTrigger value="account">
            <span className="me-1.5 inline-flex text-base">
              <MaterialIcon name="person" />
            </span>
            <span>User Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Model Configuration */}
        <TabsContent value="ai">
          <AiSettingsTab />
        </TabsContent>

        {/* Tab 2: Clinic Profile */}
        <TabsContent value="clinic">
          <div className="mt-6 rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    Clinic Branch Information
                  </span>
                </CardTitle>
                <CardDescription>
                  Facility identification and jurisdiction details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Clinic Identifier:
                    </span>
                    <p className="font-mono text-sm font-bold text-foreground">
                      {clinicId}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Clinical Standards:
                    </span>
                    <p className="text-sm text-foreground">
                      Egyptian MOH Mandatory Schedule + WHO Multicentre Growth
                      Reference
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: User Account */}
        <TabsContent value="account">
          <div className="mt-6 rounded-xl border border-border bg-card">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base font-bold text-foreground">
                    Clinician Profile
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Name:</strong> {clinicianName}
                  </p>
                  <p>
                    <strong>Role:</strong> {clinicianRole}
                  </p>
                  <p>
                    <strong>User ID:</strong> {user?.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const Route = createLazyFileRoute('/_app/settings')({
  component: SettingsComponent,
});
