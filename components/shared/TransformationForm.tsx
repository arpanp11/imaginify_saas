'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  aspectRatioOptions,
  creditFee,
  defaultValues,
  transformationTypes,
} from '@/constants';
import { CustomField } from './CustomField';
import { useEffect, useState, useTransition } from 'react';
import { AspectRatioKey, debounce, deepMergeObjects } from '@/lib/utils';
import { updateCredits } from '@/lib/actions/user.actions';
import MediaUploder from './MediaUploder';
import TransformedImage from './TransformedImage';
import { getCldImageUrl } from 'next-cloudinary';
import { addImage, updateImage } from '@/lib/actions/image.actions';
import { useRouter } from 'next/navigation';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
});

const TransformationForm = ({
  action,
  data = null,
  userId,
  type,
  creditBalance,
  config = null,
}: TransformationFormProps) => {
  const transformationType = transformationTypes[type];
  const [image, setImage] = useState(data);
  const [newTransformation, setNewTransformation] =
    useState<Transformations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config);
  const [isPendding, startTransition] = useTransition();

  const router = useRouter();

  const initialValues =
    data && action === 'Update'
      ? {
          title: data?.title,
          aspectRatio: data?.aspectRatio,
          color: data?.color,
          prompt: data?.prompt,
          publicId: data?.publicId,
        }
      : defaultValues;

  // step 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // step 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    if (data || image) {
      const transformationUrl = getCldImageUrl({
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig,
      });

      const imageData = {
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: transformationConfig,
        secureURL: image?.secureURL,
        transformationURL: transformationUrl,
        aspectRatio: values.aspectRatio,
        prompt: values.prompt,
        color: values.color,
      };

      if (action === 'Add') {
        try {
          const newImage = await addImage({
            image: imageData,
            userId,
            path: '/',
          });

          if (newImage) {
            form.reset();
            setImage(data);
            router.push(`/transformations/${newImage._id}`);
          }
        } catch (error) {
          console.log(error);
        }
      }

      if (action === 'Update') {
        try {
          const updatedImage = await updateImage({
            image: {
              ...imageData,
              _id: data._id,
            },
            userId,
            path: `/transformations/${data._id}`,
          });

          if (updatedImage) {
            router.push(`/transformations/${updatedImage._id}`);
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    setIsSubmitting(false);
  }

  /**
   * Handles selecting a field from the aspect ratio dropdown.
   * Updates the image state with the new aspect ratio.
   * Sets the new transformation to the config for the current transformation type.
   * Calls the onChangeField callback with the new value.
   */
  const onSelectFieldHandler = (
    value: string,
    onChangeField: (value: string) => void
  ) => {
    const imageSize = aspectRatioOptions[value as AspectRatioKey];

    setImage((prevImage: any) => ({
      ...prevImage,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }));

    setNewTransformation(transformationType.config);

    return onChangeField(value);
  };

  /**
   * Handles updating the transformation config when an input field changes.
   * Debounces the update to avoid unnecessary rerenders.
   * Updates the newTransformation state with the changed field.
   * Calls the onChangeField callback with the new value.
   */
  const onInputChangeHandler = (
    fieldName: string,
    value: string,
    type: string,
    onChangeField: (value: string) => void
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({
        ...prevState,
        [type]: {
          ...prevState?.[type],
          [fieldName === 'prompt' ? 'prompt' : 'to']: value,
        },
      }));

      return onChangeField(value);
    }, 1000);
  };

  /**
   * Handles transforming the image when the transform button is clicked.
   * Sets isTransforming to true to show a loading state.
   * Merges the newTransformation with the existing transformationConfig.
   * Clears the newTransformation state.
   * Calls startTransition to transition to the new transformed image.
   * Calls updateCredits to deduct credits for the transformation.
   */
  const onTransformHandler = async () => {
    setIsTransforming(true);

    setTransformationConfig(
      deepMergeObjects(newTransformation, transformationConfig)
    );

    setNewTransformation(null);
    startTransition(async () => {
      await updateCredits(userId, creditFee);
    });
  };

  useEffect(() => {
    if (image && (type === 'restore' || type === 'removeBackground')) {
      setNewTransformation(transformationType.config);
    }
  }, [image, transformationType.config, type]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {creditBalance < Math.abs(creditFee) && <InsufficientCreditsModal />}

        <CustomField
          control={form.control}
          name='title'
          formLabel='Image Title'
          className='w-full'
          render={({ field }) => <Input {...field} />}
        />

        {/* generative fill */}
        {type === 'fill' && (
          <CustomField
            control={form.control}
            name='aspectRatio'
            formLabel='Aspect Ratio'
            className='w-full'
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  onSelectFieldHandler(value, field.onChange)
                }
              >
                <SelectTrigger className='select-field'>
                  <SelectValue
                    placeholder='
                  Select size'
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(aspectRatioOptions).map((key) => (
                    <SelectItem key={key} value={key} className='select-item'>
                      {aspectRatioOptions[key as AspectRatioKey].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}

        {/* object remove/recolor */}
        {(type === 'remove' || type === 'recolor') && (
          <div className='prompt-field'>
            <CustomField
              control={form.control}
              name='prompt'
              formLabel={
                type === 'remove' ? 'Object to Remove' : 'Color to Recolor'
              }
              className='w-full'
              render={({ field }) => (
                <Input
                  value={field.value}
                  className='input-field'
                  onChange={(e) =>
                    onInputChangeHandler(
                      'prompt',
                      e.target.value,
                      type,
                      field.onChange
                    )
                  }
                />
              )}
            />

            {/* obnect recolor */}
            {type === 'recolor' && (
              <CustomField
                control={form.control}
                name='color'
                formLabel='Replacement Color'
                className='w-full'
                render={({ field }) => (
                  <Input
                    value={field.value}
                    className='input-field'
                    onChange={(e) =>
                      onInputChangeHandler(
                        'color',
                        e.target.value,
                        'recolor',
                        field.onChange
                      )
                    }
                  />
                )}
              />
            )}
          </div>
        )}

        {/* image uploader */}
        <div className='media-uploader-field'>
          <CustomField
            control={form.control}
            name='publicId'
            className='flex size-full flex-col'
            render={({ field }) => (
              <MediaUploder
                onValueChange={field.onChange}
                setImage={setImage}
                publicId={field.value}
                image={image}
                type={type}
              />
            )}
          />

          <TransformedImage
            image={image}
            type={type}
            title={form.getValues().title}
            isTransforming={isTransforming}
            setIsTransforming={setIsTransforming}
            transformationConfig={transformationConfig}
          />
        </div>

        <div className='flex flex-col gap-4'>
          {/*  transforming button */}
          <Button
            type='button'
            className='submit-button capitalize'
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler}
          >
            {isTransforming ? 'Transforming...' : 'Apply Transformation'}
          </Button>

          {/* submit button */}
          <Button
            type='submit'
            className='submit-button capitalize'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Save Image'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransformationForm;
