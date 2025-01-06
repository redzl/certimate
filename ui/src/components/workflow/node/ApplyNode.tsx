import { memo, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Typography } from "antd";
import { produce } from "immer";

import { type WorkflowNodeConfigForApply, WorkflowNodeType } from "@/domain/workflow";
import { useZustandShallowSelector } from "@/hooks";
import { useAccessesStore } from "@/stores/access";
import { useContactEmailsStore } from "@/stores/contact";
import { useWorkflowStore } from "@/stores/workflow";

import ApplyNodeConfigForm, { type ApplyNodeConfigFormInstance } from "./ApplyNodeConfigForm";
import SharedNode, { type SharedNodeProps } from "./_SharedNode";

export type ApplyNodeProps = SharedNodeProps;

const ApplyNode = ({ node, disabled }: ApplyNodeProps) => {
  if (node.type !== WorkflowNodeType.Apply) {
    console.warn(`[certimate] current workflow node type is not: ${WorkflowNodeType.Apply}`);
  }

  const { t } = useTranslation();

  const { accesses } = useAccessesStore(useZustandShallowSelector("accesses"));
  const { addEmail } = useContactEmailsStore(useZustandShallowSelector(["addEmail"]));
  const { updateNode } = useWorkflowStore(useZustandShallowSelector(["updateNode"]));

  const wrappedEl = useMemo(() => {
    if (node.type !== WorkflowNodeType.Apply) {
      console.warn(`[certimate] current workflow node type is not: ${WorkflowNodeType.Apply}`);
    }

    if (!node.validated) {
      return <Typography.Link>{t("workflow_node.action.configure_node")}</Typography.Link>;
    }

    const config = (node.config as WorkflowNodeConfigForApply) ?? {};
    return <Typography.Text className="truncate">{config.domains || "　"}</Typography.Text>;
  }, [node]);

  const formRef = useRef<ApplyNodeConfigFormInstance>(null);
  const [formPending, setFormPending] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const getFormValues = () => formRef.current!.getFieldsValue() as WorkflowNodeConfigForApply;

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
          provider: accesses.find((e) => e.id === newValues.providerAccessId)?.provider,
        };
        draft.validated = true;
      });
      await updateNode(newNode);
      await addEmail(newValues.contactEmail);
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
        <ApplyNodeConfigForm ref={formRef} disabled={disabled} initialValues={node.config} />
      </SharedNode.ConfigDrawer>
    </>
  );
};

export default memo(ApplyNode);
