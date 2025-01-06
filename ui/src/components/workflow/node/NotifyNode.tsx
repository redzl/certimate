import { memo, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Typography } from "antd";
import { produce } from "immer";

import { notifyChannelsMap } from "@/domain/settings";
import { type WorkflowNodeConfigForNotify, WorkflowNodeType } from "@/domain/workflow";
import { useZustandShallowSelector } from "@/hooks";
import { useWorkflowStore } from "@/stores/workflow";

import NotifyNodeConfigForm, { type NotifyNodeConfigFormInstance } from "./NotifyNodeConfigForm";
import SharedNode, { type SharedNodeProps } from "./_SharedNode";

export type NotifyNodeProps = SharedNodeProps;

const NotifyNode = ({ node, disabled }: NotifyNodeProps) => {
  if (node.type !== WorkflowNodeType.Notify) {
    console.warn(`[certimate] current workflow node type is not: ${WorkflowNodeType.Notify}`);
  }

  const { t } = useTranslation();

  const { updateNode } = useWorkflowStore(useZustandShallowSelector(["updateNode"]));

  const formRef = useRef<NotifyNodeConfigFormInstance>(null);
  const [formPending, setFormPending] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const getFormValues = () => formRef.current!.getFieldsValue() as WorkflowNodeConfigForNotify;

  const wrappedEl = useMemo(() => {
    if (node.type !== WorkflowNodeType.Notify) {
      console.warn(`[certimate] current workflow node type is not: ${WorkflowNodeType.Notify}`);
    }

    if (!node.validated) {
      return <Typography.Link>{t("workflow_node.action.configure_node")}</Typography.Link>;
    }

    const config = (node.config as WorkflowNodeConfigForNotify) ?? {};
    const channel = notifyChannelsMap.get(config.channel as string);
    return (
      <div className="flex items-center justify-between space-x-2">
        <Typography.Text className="truncate">{t(channel?.name ?? "　")}</Typography.Text>
        <Typography.Text className="truncate" type="secondary">
          {config.subject ?? ""}
        </Typography.Text>
      </div>
    );
  }, [node]);

  const handleDrawerConfirm = async () => {
    setFormPending(true);
    try {
      await formRef.current!.validateFields();
    } catch (err) {
      setFormPending(false);
      throw err;
    }

    try {
      const newValues = getFormValues();
      const newNode = produce(node, (draft) => {
        draft.config = {
          ...newValues,
        };
        draft.validated = true;
      });
      await updateNode(newNode);
    } finally {
      setFormPending(false);
    }
  };

  return (
    <>
      <SharedNode.Wrapper node={node} disabled={disabled} onClick={() => setDrawerOpen(true)}>
        {wrappedEl}
      </SharedNode.Wrapper>

      <SharedNode.ConfigDrawer
        node={node}
        open={drawerOpen}
        pending={formPending}
        onConfirm={handleDrawerConfirm}
        onOpenChange={(open) => setDrawerOpen(open)}
        getFormValues={() => formRef.current!.getFieldsValue()}
      >
        <NotifyNodeConfigForm ref={formRef} disabled={disabled} initialValues={node.config} />
      </SharedNode.ConfigDrawer>
    </>
  );
};

export default memo(NotifyNode);
