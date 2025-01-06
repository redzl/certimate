import { memo, useMemo } from "react";

import { type WorkflowNode, WorkflowNodeType } from "@/domain/workflow";

import ApplyNode from "./node/ApplyNode";
import BranchNode from "./node/BranchNode";
import ConditionNode from "./node/ConditionNode";
import DeployNode from "./node/DeployNode";
import EndNode from "./node/EndNode";
import NotifyNode from "./node/NotifyNode";
import StartNode from "./node/StartNode";

export type WorkflowElementProps = {
  node: WorkflowNode;
  disabled?: boolean;
  branchId?: string;
  branchIndex?: number;
};

const WorkflowElement = ({ node, disabled, branchId, branchIndex }: WorkflowElementProps) => {
  const nodeEl = useMemo(() => {
    switch (node.type) {
      case WorkflowNodeType.Start:
        return <StartNode node={node} disabled={disabled} />;

      case WorkflowNodeType.Apply:
        return <ApplyNode node={node} disabled={disabled} />;

      case WorkflowNodeType.Deploy:
        return <DeployNode node={node} disabled={disabled} />;

      case WorkflowNodeType.Notify:
        return <NotifyNode node={node} disabled={disabled} />;

      case WorkflowNodeType.Branch:
        return <BranchNode node={node} disabled={disabled} />;

      case WorkflowNodeType.Condition:
        return <ConditionNode node={node} disabled={disabled} branchId={branchId!} branchIndex={branchIndex!} />;

      case WorkflowNodeType.End:
        return <EndNode />;

      default:
        console.warn(`[certimate] unsupported workflow node type: ${node.type}`);
        return <></>;
    }
  }, [node, disabled, branchId, branchIndex]);

  return <>{nodeEl}</>;
};

export default memo(WorkflowElement);
