import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormOutlined as FormOutlinedIcon, PlusOutlined as PlusOutlinedIcon, QuestionCircleOutlined as QuestionCircleOutlinedIcon } from "@ant-design/icons";
import { useControllableValue } from "ahooks";
import { AutoComplete, type AutoCompleteProps, Button, Divider, Form, type FormInstance, Input, Select, Space, Switch, Tooltip, Typography } from "antd";
import { createSchemaFieldRule } from "antd-zod";
import { z } from "zod";

import ModalForm from "@/components/ModalForm";
import MultipleInput from "@/components/MultipleInput";
import AccessEditModal from "@/components/access/AccessEditModal";
import AccessSelect from "@/components/access/AccessSelect";
import { ACCESS_USAGES, accessProvidersMap } from "@/domain/provider";
import { type WorkflowNode, type WorkflowNodeConfigForApply } from "@/domain/workflow";
import { useContactEmailsStore } from "@/stores/contact";
import { validDomainName, validIPv4Address, validIPv6Address } from "@/utils/validators";

type ApplyNodeFormFieldValues = Partial<WorkflowNodeConfigForApply>;

export type ApplyNodeFormProps = {
  form: FormInstance;
  formName?: string;
  disabled?: boolean;
  workflowNode: WorkflowNode;
  onValuesChange?: (values: ApplyNodeFormFieldValues) => void;
};

const MULTIPLE_INPUT_DELIMITER = ";";

const initFormModel = (): ApplyNodeFormFieldValues => {
  return {
    keyAlgorithm: "RSA2048",
    propagationTimeout: 60,
    disableFollowCNAME: true,
  };
};

const ApplyNodeForm = ({ form, formName, disabled, workflowNode, onValuesChange }: ApplyNodeFormProps) => {
  const { t } = useTranslation();

  const formSchema = z.object({
    domains: z.string({ message: t("workflow_node.apply.form.domains.placeholder") }).refine((v) => {
      return String(v)
        .split(MULTIPLE_INPUT_DELIMITER)
        .every((e) => validDomainName(e, true));
    }, t("common.errmsg.domain_invalid")),
    contactEmail: z.string({ message: t("workflow_node.apply.form.contact_email.placeholder") }).email(t("common.errmsg.email_invalid")),
    providerAccessId: z
      .string({ message: t("workflow_node.apply.form.provider_access.placeholder") })
      .min(1, t("workflow_node.apply.form.provider_access.placeholder")),
    keyAlgorithm: z
      .string({ message: t("workflow_node.apply.form.key_algorithm.placeholder") })
      .nonempty(t("workflow_node.apply.form.key_algorithm.placeholder")),
    nameservers: z
      .string()
      .nullish()
      .refine((v) => {
        if (!v) return true;
        return String(v)
          .split(MULTIPLE_INPUT_DELIMITER)
          .every((e) => validIPv4Address(e) || validIPv6Address(e) || validDomainName(e));
      }, t("common.errmsg.host_invalid")),
    propagationTimeout: z
      .union([
        z.number().int().gte(1, t("workflow_node.apply.form.propagation_timeout.placeholder")),
        z.string().refine((v) => !v || /^[1-9]\d*$/.test(v), t("workflow_node.apply.form.propagation_timeout.placeholder")),
      ])
      .nullish(),
    disableFollowCNAME: z.boolean().nullish(),
  });
  const formRule = createSchemaFieldRule(formSchema);

  const initialValues: ApplyNodeFormFieldValues = (workflowNode.config as WorkflowNodeConfigForApply) ?? initFormModel();

  const fieldDomains = Form.useWatch<string>("domains", form);
  const fieldNameservers = Form.useWatch<string>("nameservers", form);

  const handleFormChange = (_: unknown, values: z.infer<typeof formSchema>) => {
    onValuesChange?.(values as ApplyNodeFormFieldValues);
  };

  return (
    <Form
      form={form}
      disabled={disabled}
      initialValues={initialValues}
      layout="vertical"
      name={formName}
      preserve={false}
      scrollToFirstError
      onValuesChange={handleFormChange}
    >
      <Form.Item
        name="domains"
        label={t("workflow_node.apply.form.domains.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("workflow_node.apply.form.domains.tooltip") }}></span>}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input
            disabled={disabled}
            value={fieldDomains}
            placeholder={t("workflow_node.apply.form.domains.placeholder")}
            onChange={(e) => {
              form.setFieldValue("domains", e.target.value);
            }}
          />
          <FormFieldDomainsModalForm
            data={fieldDomains}
            trigger={
              <Button disabled={disabled}>
                <FormOutlinedIcon />
              </Button>
            }
            onFinish={(v) => {
              form.setFieldValue("domains", v);
            }}
          />
        </Space.Compact>
      </Form.Item>

      <Form.Item
        name="contactEmail"
        label={t("workflow_node.apply.form.contact_email.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("workflow_node.apply.form.contact_email.tooltip") }}></span>}
      >
        <FormFieldEmailSelect placeholder={t("workflow_node.apply.form.contact_email.placeholder")} />
      </Form.Item>

      <Form.Item className="mb-0">
        <label className="mb-1 block">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="max-w-full grow truncate">
              <span>{t("workflow_node.apply.form.provider_access.label")}</span>
              <Tooltip title={t("workflow_node.apply.form.provider_access.tooltip")}>
                <Typography.Text className="ms-1" type="secondary">
                  <QuestionCircleOutlinedIcon />
                </Typography.Text>
              </Tooltip>
            </div>
            <div className="text-right">
              <AccessEditModal
                preset="add"
                trigger={
                  <Button size="small" type="link">
                    <PlusOutlinedIcon />
                    {t("workflow_node.apply.form.provider_access.button")}
                  </Button>
                }
                onSubmit={(record) => {
                  const provider = accessProvidersMap.get(record.provider);
                  if (ACCESS_USAGES.ALL === provider?.usage || ACCESS_USAGES.APPLY === provider?.usage) {
                    form.setFieldValue("providerAccessId", record.id);
                  }
                }}
              />
            </div>
          </div>
        </label>
        <Form.Item name="providerAccessId" rules={[formRule]}>
          <AccessSelect
            placeholder={t("workflow_node.apply.form.provider_access.placeholder")}
            filter={(record) => {
              const provider = accessProvidersMap.get(record.provider);
              return ACCESS_USAGES.ALL === provider?.usage || ACCESS_USAGES.APPLY === provider?.usage;
            }}
          />
        </Form.Item>
      </Form.Item>

      <Divider className="my-1">
        <Typography.Text className="text-xs font-normal" type="secondary">
          {t("workflow_node.apply.form.advanced_config.label")}
        </Typography.Text>
      </Divider>

      <Form.Item name="keyAlgorithm" label={t("workflow_node.apply.form.key_algorithm.label")} rules={[formRule]}>
        <Select
          options={["RSA2048", "RSA3072", "RSA4096", "RSA8192", "EC256", "EC384"].map((e) => ({
            label: e,
            value: e,
          }))}
          placeholder={t("workflow_node.apply.form.key_algorithm.placeholder")}
        />
      </Form.Item>

      <Form.Item
        name="nameservers"
        label={t("workflow_node.apply.form.nameservers.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("workflow_node.apply.form.nameservers.tooltip") }}></span>}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input
            allowClear
            disabled={disabled}
            value={fieldNameservers}
            placeholder={t("workflow_node.apply.form.nameservers.placeholder")}
            onChange={(e) => {
              form.setFieldValue("nameservers", e.target.value);
            }}
          />
          <FormFieldNameserversModalForm
            data={fieldNameservers}
            trigger={
              <Button disabled={disabled}>
                <FormOutlinedIcon />
              </Button>
            }
            onFinish={(v) => {
              form.setFieldValue("nameservers", v);
            }}
          />
        </Space.Compact>
      </Form.Item>

      <Form.Item
        name="propagationTimeout"
        label={t("workflow_node.apply.form.propagation_timeout.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("workflow_node.apply.form.propagation_timeout.tooltip") }}></span>}
      >
        <Input
          type="number"
          allowClear
          min={0}
          max={3600}
          placeholder={t("workflow_node.apply.form.propagation_timeout.placeholder")}
          addonAfter={t("workflow_node.apply.form.propagation_timeout.suffix")}
        />
      </Form.Item>

      <Form.Item
        name="disableFollowCNAME"
        label={t("workflow_node.apply.form.disable_follow_cname.label")}
        rules={[formRule]}
        tooltip={<span dangerouslySetInnerHTML={{ __html: t("workflow_node.apply.form.disable_follow_cname.tooltip") }}></span>}
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

const FormFieldEmailSelect = ({
  className,
  style,
  disabled,
  placeholder,
  ...props
}: {
  className?: string;
  style?: React.CSSProperties;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) => {
  const { emails, fetchEmails } = useContactEmailsStore();
  const emailsToOptions = useCallback(() => emails.map((email) => ({ label: email, value: email })), [emails]);
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const [value, setValue] = useControllableValue<string>(props, {
    valuePropName: "value",
    defaultValuePropName: "defaultValue",
    trigger: "onChange",
  });

  const [options, setOptions] = useState<AutoCompleteProps["options"]>([]);
  useEffect(() => {
    setOptions(emailsToOptions());
  }, [emails, emailsToOptions]);

  const handleChange = (value: string) => {
    setValue(value);
  };

  const handleSearch = (text: string) => {
    const temp = emailsToOptions();
    if (text?.trim()) {
      if (temp.every((option) => option.label !== text)) {
        temp.unshift({ label: text, value: text });
      }
    }

    setOptions(temp);
  };

  return (
    <AutoComplete
      className={className}
      style={style}
      backfill
      defaultValue={value}
      disabled={disabled}
      filterOption
      options={options}
      placeholder={placeholder}
      showSearch
      value={value}
      onChange={handleChange}
      onSearch={handleSearch}
    />
  );
};

const FormFieldDomainsModalForm = ({
  data,
  trigger,
  onFinish,
}: {
  data?: string;
  disabled?: boolean;
  trigger?: React.ReactNode;
  onFinish?: (data: string) => void;
}) => {
  const { t } = useTranslation();

  const formSchema = z.object({
    domains: z.array(z.string()).refine((v) => {
      return v.every((e) => !e?.trim() || validDomainName(e.trim(), true));
    }, t("common.errmsg.domain_invalid")),
  });
  const formRule = createSchemaFieldRule(formSchema);
  const [form] = Form.useForm<z.infer<typeof formSchema>>();

  const [model, setModel] = useState<Partial<z.infer<typeof formSchema>>>({ domains: data?.split(MULTIPLE_INPUT_DELIMITER) });
  useEffect(() => {
    setModel({ domains: data?.split(MULTIPLE_INPUT_DELIMITER) });
  }, [data]);

  const handleFormFinish = (values: z.infer<typeof formSchema>) => {
    onFinish?.(
      values.domains
        .map((e) => e.trim())
        .filter((e) => !!e)
        .join(MULTIPLE_INPUT_DELIMITER)
    );
  };

  return (
    <ModalForm
      layout="vertical"
      form={form}
      initialValues={model}
      modalProps={{ destroyOnClose: true }}
      title={t("workflow_node.apply.form.domains.multiple_input_modal.title")}
      trigger={trigger}
      validateTrigger="onSubmit"
      width={480}
      onFinish={handleFormFinish}
    >
      <Form.Item name="domains" rules={[formRule]}>
        <MultipleInput placeholder={t("workflow_node.apply.form.domains.multiple_input_modal.placeholder")} />
      </Form.Item>
    </ModalForm>
  );
};

const FormFieldNameserversModalForm = ({ data, trigger, onFinish }: { data?: string; trigger?: React.ReactNode; onFinish?: (data: string) => void }) => {
  const { t } = useTranslation();

  const formSchema = z.object({
    nameservers: z.array(z.string()).refine((v) => {
      return v.every((e) => !e?.trim() || validIPv4Address(e) || validIPv6Address(e) || validDomainName(e));
    }, t("common.errmsg.domain_invalid")),
  });
  const formRule = createSchemaFieldRule(formSchema);
  const [form] = Form.useForm<z.infer<typeof formSchema>>();

  const [model, setModel] = useState<Partial<z.infer<typeof formSchema>>>({ nameservers: data?.split(MULTIPLE_INPUT_DELIMITER) });
  useEffect(() => {
    setModel({ nameservers: data?.split(MULTIPLE_INPUT_DELIMITER) });
  }, [data]);

  const handleFormFinish = (values: z.infer<typeof formSchema>) => {
    onFinish?.(
      values.nameservers
        .map((e) => e.trim())
        .filter((e) => !!e)
        .join(MULTIPLE_INPUT_DELIMITER)
    );
  };

  return (
    <ModalForm
      layout="vertical"
      form={form}
      initialValues={model}
      modalProps={{ destroyOnClose: true }}
      title={t("workflow_node.apply.form.nameservers.multiple_input_modal.title")}
      trigger={trigger}
      validateTrigger="onSubmit"
      width={480}
      onFinish={handleFormFinish}
    >
      <Form.Item name="nameservers" rules={[formRule]}>
        <MultipleInput placeholder={t("workflow_node.apply.form.nameservers.multiple_input_modal.placeholder")} />
      </Form.Item>
    </ModalForm>
  );
};

export default memo(ApplyNodeForm);
